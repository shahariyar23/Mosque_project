import { BadRequestException, HttpStatus, Logger, NotFoundException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';

import { AllExceptionsFilter } from './all-exceptions.filter';

/**
 * Tests for the exception filter.
 *
 * The subject here is what a caller is told. Two rules are worth pinning down with tests: a body a
 * caller can fix must be reported as their fault with a message naming what to fix, and nothing a
 * parser, a database or a stack trace says may appear verbatim — it goes to the log instead.
 */
interface Reply {
  status: number;
  body: Record<string, unknown>;
  /** Everything the filter sent to `logger.error`, so the log half of the contract can be checked. */
  logged: string;
}

/** The filter logs by design; captured rather than printed so the suite output stays readable. */
let errorLog: unknown[][];

beforeEach(() => {
  errorLog = [];
  jest.spyOn(Logger.prototype, 'error').mockImplementation((...args: unknown[]) => {
    errorLog.push(args);
  });
  jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

function run(exception: unknown, url = '/api/v1/users'): Reply {
  const captured: Partial<Reply> = {};

  const adapterHost = {
    httpAdapter: {
      reply: (_response: unknown, body: Record<string, unknown>, status: number) => {
        captured.body = body;
        captured.status = status;
      },
    },
  } as unknown as HttpAdapterHost;

  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ url, method: 'POST', id: 'req-1' }),
      getResponse: () => ({}),
    }),
  } as unknown as ArgumentsHost;

  new AllExceptionsFilter(adapterHost).catch(exception, host);

  return { ...(captured as Omit<Reply, 'logged'>), logged: JSON.stringify(errorLog) };
}

/** What body-parser raises: an ordinary Error carrying a `type` marker and the status it wants. */
function bodyParserError(type: string, status: number, message: string): Error {
  return Object.assign(new Error(message), { type, status, statusCode: status, expose: true });
}

describe('AllExceptionsFilter', () => {
  describe('a body the caller can fix', () => {
    it('keeps the location from the JSON parser but rewrites the phrasing', () => {
      // Nest intercepts body-parser's parse failure and rethrows it as a BadRequestException whose
      // message is V8's own text. This is the exact shape observed in the running app.
      const nestRewrapped = new BadRequestException(
        "Expected ':' after property name in JSON at position 304 (line 10 column 53)",
      );

      const reply = run(nestRewrapped);

      expect(reply.status).toBe(HttpStatus.BAD_REQUEST);
      expect(reply.body.code).toBe('MALFORMED_JSON');
      // The line and column are the only part a caller can act on, so they have to survive.
      expect(reply.body.message).toEqual(expect.stringContaining('line 10, column 53'));
      expect(reply.body.errors).toEqual({ body: ['Invalid JSON at line 10, column 53.'] });
      // The parser's own phrasing and its byte offset do not.
      expect(reply.body.message).not.toMatch(/position 304|property name in JSON/);
    });

    it('falls back to the offset when the parser gives no line', () => {
      // Older V8 reports only `at position N`.
      const reply = run(new BadRequestException('Unexpected end of JSON input at position 17'));

      expect(reply.body.code).toBe('MALFORMED_JSON');
      expect(reply.body.message).toEqual(expect.stringContaining('character 17'));
    });

    it('still explains itself when the parser gives no location at all', () => {
      const reply = run(new BadRequestException('Unexpected end of JSON input'));

      expect(reply.body.code).toBe('MALFORMED_JSON');
      expect(reply.body.message).toEqual(expect.stringContaining('not valid JSON'));
      expect(reply.body.errors).toBeUndefined();
    });

    it('never quotes the offending text back, in case it straddles the password', () => {
      // The realistic shape of the problem: a broken value two lines below a credential.
      const reply = run(
        new BadRequestException(
          "Expected ':' after property name in JSON at position 304 (line 10 column 53) " +
            'near "password": "hunter2"',
        ),
      );

      expect(JSON.stringify(reply.body)).not.toMatch(/hunter2|password/i);
    });

    it('reads the location off a parse failure that still carries its marker', () => {
      const reply = run(
        bodyParserError(
          'entity.parse.failed',
          400,
          'Unexpected token } in JSON at position 17 (line 3 column 5)',
        ),
      );

      expect(reply.status).toBe(HttpStatus.BAD_REQUEST);
      expect(reply.body.code).toBe('MALFORMED_JSON');
      expect(reply.body.message).toEqual(expect.stringContaining('line 3, column 5'));
    });

    it('reports an oversized body as the caller’s to fix, not a server fault', () => {
      // This was answered with 500 INTERNAL_ERROR before: body-parser's class matched no branch, so
      // a request the caller could shorten was reported as the server having broken.
      const reply = run(bodyParserError('entity.too.large', 413, 'request entity too large'));

      expect(reply.status).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
      expect(reply.body.code).toBe('PAYLOAD_TOO_LARGE');
      expect(reply.status).toBeLessThan(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it.each([
      ['request.aborted', HttpStatus.BAD_REQUEST, 'REQUEST_ABORTED'],
      ['request.size.invalid', HttpStatus.BAD_REQUEST, 'CONTENT_LENGTH_MISMATCH'],
      ['encoding.unsupported', HttpStatus.UNSUPPORTED_MEDIA_TYPE, 'UNSUPPORTED_ENCODING'],
      ['charset.unsupported', HttpStatus.UNSUPPORTED_MEDIA_TYPE, 'UNSUPPORTED_CHARSET'],
      ['entity.verify.failed', HttpStatus.BAD_REQUEST, 'MALFORMED_BODY'],
      ['parameters.too.many', HttpStatus.BAD_REQUEST, 'TOO_MANY_PARAMETERS'],
    ])('maps %s to %i', (type, status, code) => {
      const reply = run(bodyParserError(type, status, 'raw internal text'));

      expect(reply.status).toBe(status);
      expect(reply.body.code).toBe(code);
      expect(reply.body.message).not.toBe('raw internal text');
    });

    it('leaves an unrecognised marker to the generic path rather than guessing', () => {
      const reply = run(bodyParserError('entity.something.new', 400, 'raw internal text'));

      expect(reply.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(reply.body.message).not.toBe('raw internal text');
    });
  });

  describe('not mistaken for a body failure', () => {
    it('leaves an application error alone', () => {
      // The users module throws with an object payload carrying its own code. That has to pass
      // through untouched — the JSON branch must not be greedy.
      const reply = run(
        new NotFoundException({ code: 'USER_NOT_FOUND', message: 'We could not find that user.' }),
      );

      expect(reply.status).toBe(HttpStatus.NOT_FOUND);
      expect(reply.body.code).toBe('USER_NOT_FOUND');
      expect(reply.body.message).toBe('We could not find that user.');
    });

    it('leaves an ordinary BadRequest alone when nothing suggests a parse failure', () => {
      const reply = run(new BadRequestException('Validation failed (uuid is expected)'));

      expect(reply.body.code).toBe('BAD_REQUEST');
      expect(reply.body.message).toBe('Validation failed (uuid is expected)');
    });

    it('still folds pipe failures into per-field errors', () => {
      const reply = run(
        new BadRequestException({
          message: [
            'email must be a valid email address',
            'password must be at least 8 characters',
          ],
        }),
      );

      expect(reply.body.code).toBe('VALIDATION_FAILED');
      expect(reply.body.errors).toEqual({
        email: ['email must be a valid email address'],
        password: ['password must be at least 8 characters'],
      });
    });

    it('files a rejected field under its own name, not under "property"', () => {
      // `forbidNonWhitelisted` phrases its message the other way round, so the naive first-token rule
      // filed this under a field called `property` — somewhere no form could show it.
      const reply = run(new BadRequestException({ message: ['property role should not exist'] }));

      expect(reply.body.errors).toEqual({ role: ['property role should not exist'] });
    });

    it('keeps a message it cannot attribute rather than dropping it', () => {
      const reply = run(new BadRequestException({ message: ['nonsense'] }));

      expect(reply.body.errors).toEqual({ _: ['nonsense'] });
    });
  });

  describe('nothing internal leaks', () => {
    it('hides a database error behind a generic message but logs the detail', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'The table `public.users` does not exist in the current database.',
        { code: 'P2021', clientVersion: '6.19.3' },
      );

      const reply = run(prismaError);

      expect(reply.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(reply.body.code).toBe('DATABASE_ERROR');
      expect(reply.body.message).not.toMatch(/table|public\.users|Prisma/i);
      // Masked to the caller, but an operator still has to be able to find out what happened.
      expect(reply.logged).toMatch(/P2021|public\.users/);
    });

    it('hides an unknown error and its stack but logs both', () => {
      const reply = run(new Error('connect ECONNREFUSED 10.0.0.5:5432'));

      expect(reply.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(JSON.stringify(reply.body)).not.toMatch(/ECONNREFUSED|10\.0\.0\.5/);
      expect(reply.logged).toMatch(/ECONNREFUSED/);
    });

    it('does not log a caller mistake as a server fault', () => {
      // A malformed body is not an operational event; it must not appear in the error log.
      const reply = run(new BadRequestException('Unexpected end of JSON input'));

      expect(reply.logged).toBe('[]');
    });
  });

  it('carries the request id and path on every response', () => {
    const reply = run(new BadRequestException('{ bad JSON'), '/api/v1/users/abc');

    expect(reply.body.path).toBe('/api/v1/users/abc');
    expect(reply.body.requestId).toBe('req-1');
    expect(typeof reply.body.timestamp).toBe('string');
  });
});
