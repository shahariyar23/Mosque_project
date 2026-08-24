import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

/**
 * The single place an unhandled error becomes a response.
 *
 * Two rules drive the shape below. First, a stack trace must never reach a client in production —
 * so the body is assembled from a known set of fields and never from the error object itself.
 * Second, the frontend's `ServiceError` branches on a stable `code` and shows `message` to a person
 * verbatim, so every response carries both, and `message` is written in plain language.
 *
 * Unrecognised errors become a generic 500: the real detail goes to the log with the request id, and
 * the caller gets something safe to display.
 */

interface ErrorBody {
  statusCode: number;
  /** Stable, machine-readable. The frontend switches on this. */
  code: string;
  /** Safe to show a person. */
  message: string;
  /** Field-level failures from validation, when there are any. */
  errors?: Record<string, string[]>;
  path: string;
  timestamp: string;
  requestId?: string;
}

/** What every branch below produces: the parts of `ErrorBody` that depend on the error. */
interface Resolved {
  status: number;
  code: string;
  message: string;
  errors?: Record<string, string[]>;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & { id?: string }>();
    const response = ctx.getResponse<Response>();

    const resolved = this.resolve(exception);

    const body: ErrorBody = {
      statusCode: resolved.status,
      code: resolved.code,
      message: resolved.message,
      ...(resolved.errors ? { errors: resolved.errors } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
      ...(request.id ? { requestId: request.id } : {}),
    };

    // Server faults carry the underlying error into the log — the one place it is allowed to appear.
    // Client faults are logged at debug only; a wrong password is not an operational event.
    if (resolved.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} → ${resolved.status} ${resolved.code}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.debug(`${request.method} ${request.url} → ${resolved.status} ${resolved.code}`);
    }

    httpAdapter.reply(response, body, resolved.status);
  }

  private resolve(exception: unknown): Resolved {
    // Checked before the HttpException branch, because Nest rewraps one of these as a
    // BadRequestException and the rewrapped form has to be caught before it looks like an ordinary one.
    const bodyFailure = fromBodyRead(exception);
    if (bodyFailure) {
      return bodyFailure;
    }

    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    if (
      exception instanceof Prisma.PrismaClientKnownRequestError ||
      exception instanceof Prisma.PrismaClientValidationError
    ) {
      return this.fromPrisma(exception);
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our end. Please try again.',
    };
  }

  private fromHttpException(exception: HttpException): Resolved {
    const status = exception.getStatus();
    const payload = exception.getResponse();

    if (typeof payload === 'string') {
      return { status, code: defaultCodeFor(status), message: payload };
    }

    const record = payload as Record<string, unknown>;

    // The global ValidationPipe is configured to throw a BadRequest whose payload carries a
    // `message` array of constraint strings. Folded into `errors` here so a form can attach each
    // failure to its field instead of showing one long sentence.
    const raw = record.message;
    if (Array.isArray(raw)) {
      return {
        status,
        code: 'VALIDATION_FAILED',
        message: 'Some of the details provided are not valid.',
        errors: groupConstraints(raw.map(String)),
      };
    }

    return {
      status,
      code: typeof record.code === 'string' ? record.code : defaultCodeFor(status),
      message: typeof raw === 'string' ? raw : defaultMessageFor(status),
      errors: (record.errors as Record<string, string[]> | undefined) ?? undefined,
    };
  }

  /**
   * Prisma errors, mapped to the few that are genuinely the caller's fault.
   *
   * The messages are rewritten rather than passed through: Prisma's own text names tables, columns
   * and constraints, which is internal shape a client should not learn.
   */
  private fromPrisma(
    exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError,
  ): Resolved {
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: 'INVALID_REQUEST',
        message: 'The request could not be processed as sent.',
      };
    }

    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          code: 'ALREADY_EXISTS',
          message: 'A record with these details already exists.',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'RELATED_RECORD_MISSING',
          message: 'A record this refers to does not exist.',
        };
      case 'P2014':
        return {
          status: HttpStatus.CONFLICT,
          code: 'RELATED_RECORDS_EXIST',
          message: 'Other records depend on this one, so it cannot be changed that way.',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          message: 'The requested record no longer exists.',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'DATABASE_ERROR',
          message: 'Something went wrong on our end. Please try again.',
        };
    }
  }
}

/**
 * Turns `["email must be an email", "password is too short"]` into
 * `{ email: [...], password: [...] }`.
 *
 * class-validator puts the property name first in its default messages, so the leading token is the
 * field. Anything that does not parse lands under `_` rather than being dropped.
 */
function groupConstraints(messages: string[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const message of messages) {
    (grouped[fieldOf(message)] ??= []).push(message);
  }
  return grouped;
}

/**
 * The field a constraint message is about.
 *
 * The leading token is normally the property name. The one exception is the whitelist rule, whose
 * message reads `property role should not exist` — taking the first token there would file the failure
 * under a field called `property`, which no form has, so a frontend would have nowhere to show it.
 */
function fieldOf(message: string): string {
  const unexpected = /^property\s+([A-Za-z0-9_.[\]]+)\s/.exec(message);
  if (unexpected) {
    return unexpected[1];
  }
  return /^([A-Za-z0-9_.[\]]+)\s/.exec(message)?.[1] ?? '_';
}

/**
 * Failures that happen while the request body is being read, before any handler runs.
 *
 * These need their own branch for two reasons.
 *
 * body-parser raises its own error classes rather than Nest ones, so `entity.too.large` was reaching
 * the generic fallback and being reported as a 500 — telling a caller the server had broken when the
 * truth was that they had sent too much. Each one is now answered with the status it deserves.
 *
 * The JSON case is handled separately below, because it is the one where the caller needs to be told
 * *where* as well as *what*.
 */
const BODY_READ_FAILURES: Record<string, Resolved> = {
  'entity.too.large': {
    status: HttpStatus.PAYLOAD_TOO_LARGE,
    code: 'PAYLOAD_TOO_LARGE',
    message: 'The request body is larger than this endpoint accepts.',
  },
  'entity.verify.failed': {
    status: HttpStatus.BAD_REQUEST,
    code: 'MALFORMED_BODY',
    message: 'The request body could not be read.',
  },
  'request.aborted': {
    status: HttpStatus.BAD_REQUEST,
    code: 'REQUEST_ABORTED',
    message: 'The request ended before the whole body arrived. Please try again.',
  },
  'request.size.invalid': {
    status: HttpStatus.BAD_REQUEST,
    code: 'CONTENT_LENGTH_MISMATCH',
    message: 'The body did not match the declared Content-Length.',
  },
  'encoding.unsupported': {
    status: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    code: 'UNSUPPORTED_ENCODING',
    message: 'The request body uses a content encoding this API cannot read.',
  },
  'charset.unsupported': {
    status: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    code: 'UNSUPPORTED_CHARSET',
    message: 'The request body must be sent as UTF-8.',
  },
  'parameters.too.many': {
    status: HttpStatus.BAD_REQUEST,
    code: 'TOO_MANY_PARAMETERS',
    message: 'The form body contains more fields than this endpoint accepts.',
  },
};

function fromBodyRead(exception: unknown): Resolved | null {
  // body-parser's own errors still carry the marker, whatever their class.
  const type = (exception as { type?: unknown } | null)?.type;
  if (typeof type === 'string') {
    if (type === 'entity.parse.failed') {
      return malformedJson(exception instanceof Error ? exception.message : '');
    }
    if (type in BODY_READ_FAILURES) {
      return BODY_READ_FAILURES[type];
    }
  }

  // Nest's rewrapped JSON-parse error, where the marker is gone. What survives is V8's message,
  // which always names JSON — and no message this codebase writes does, so the word is a safe
  // signal where matching the rest of the sentence would break with the next V8 release.
  if (exception instanceof BadRequestException) {
    const text = messageTextOf(exception);
    if (/\bJSON\b/.test(text)) {
      return malformedJson(text);
    }
  }

  return null;
}

/**
 * A body that is not JSON at all.
 *
 * V8's own text — `Expected ':' after property name in JSON at position 304 (line 10 column 53)` —
 * is half useless and half essential, which is why it is neither passed through nor discarded. The
 * *phrasing* is the parser talking about its own state machine, and the byte offset is an address in
 * something the caller thinks of as a document rather than a stream. The *line and column* are the
 * only thing that answers "so where is it, then", and they are what an editor shows in its status
 * bar. So the location is kept and the explanation is rewritten around it.
 *
 * The offending text itself is deliberately not quoted back. A malformed body is exactly the case
 * where the excerpt might straddle the `password` field, and no response from this API echoes a
 * credential — not even in an error, not even one the caller sent us themselves.
 */
function malformedJson(parserMessage: string): Resolved {
  const where = locationIn(parserMessage);
  const advice =
    'Check for a missing or extra comma, an unquoted property name, a missing colon between a ' +
    'property name and its value, or a value that was left out.';

  if (!where) {
    return {
      status: HttpStatus.BAD_REQUEST,
      code: 'MALFORMED_JSON',
      message: `The request body is not valid JSON. ${advice}`,
    };
  }

  return {
    status: HttpStatus.BAD_REQUEST,
    code: 'MALFORMED_JSON',
    // "at or just before", because a parser only notices at the point the text stops making sense,
    // which is often a character or two past the mistake itself.
    message: `The request body is not valid JSON. The problem is at or just before ${where}. ${advice}`,
    // Repeated in the structured slot so a client can jump to it rather than parse the sentence.
    errors: { body: [`Invalid JSON at ${where}.`] },
  };
}

/** The position from a parser message, preferring line/column over a raw offset. */
function locationIn(parserMessage: string): string | null {
  const lineColumn = /\bline (\d+) column (\d+)/.exec(parserMessage);
  if (lineColumn) {
    return `line ${lineColumn[1]}, column ${lineColumn[2]}`;
  }

  // Older V8 reports only an offset. Less useful than a line, but better than nothing at all.
  const position = /\bposition (\d+)/.exec(parserMessage);
  return position ? `character ${position[1]}` : null;
}

/** The human-readable part of an exception, whichever of Nest's two payload shapes it used. */
function messageTextOf(exception: HttpException): string {
  const payload = exception.getResponse();
  if (typeof payload === 'string') {
    return payload;
  }
  const message = (payload as { message?: unknown }).message;
  return typeof message === 'string' ? message : '';
}

function defaultCodeFor(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'BAD_REQUEST';
    case HttpStatus.UNAUTHORIZED:
      return 'UNAUTHENTICATED';
    case HttpStatus.FORBIDDEN:
      return 'FORBIDDEN';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    case HttpStatus.CONFLICT:
      return 'CONFLICT';
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return 'UNPROCESSABLE';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'RATE_LIMITED';
    default:
      return status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED';
  }
}

function defaultMessageFor(status: number): string {
  switch (status) {
    case HttpStatus.UNAUTHORIZED:
      return 'Please sign in to continue.';
    case HttpStatus.FORBIDDEN:
      return 'You do not have permission to do that.';
    case HttpStatus.NOT_FOUND:
      return 'We could not find what you were looking for.';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'Too many requests. Please wait a moment and try again.';
    default:
      return status >= 500
        ? 'Something went wrong on our end. Please try again.'
        : 'The request could not be completed.';
  }
}
