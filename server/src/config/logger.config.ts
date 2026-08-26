import type { Params } from 'nestjs-pino';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { env, type AppConfig } from './app.config';

/**
 * Structured logging, with redaction as a property of the logger rather than a rule people remember.
 *
 * The brief is explicit that passwords, access tokens, refresh tokens and financial secrets must
 * never reach the logs. Enforcing that at the call site would mean every future controller author
 * has to remember it; enforcing it here means a leaked field is redacted even when someone logs a
 * whole request object by accident.
 *
 * Each request also carries a correlation id (`x-request-id` when the caller supplies one), so the
 * lines belonging to one request can be pulled out of a production log.
 */

/**
 * Paths pino replaces with `[Redacted]`.
 *
 * Written broadly on purpose — `*` matches one level, so both `body.password` and
 * `body.user.password` are covered by the wildcard entries. Adding a path costs nothing;
 * missing one leaks a credential.
 */
const REDACTED_PATHS = [
  // Credentials on the way in
  'req.body.password',
  'req.body.currentPassword',
  'req.body.newPassword',
  'req.body.confirmPassword',
  'req.body.passwordConfirmation',
  'req.body.token',
  'req.body.refreshToken',
  'req.body.accessToken',
  'req.body.otp',
  'req.body.pin',
  'req.body.*.password',

  // Credentials in headers and cookies
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["set-cookie"]',
  'res.headers["set-cookie"]',

  // Anything a handler or error happens to attach
  'password',
  'passwordHash',
  'passwordResetTokenHash',
  'currentPassword',
  'newPassword',
  'token',
  'accessToken',
  'refreshToken',
  'refreshTokenHash',
  '*.password',
  '*.passwordHash',
  '*.passwordResetTokenHash',
  '*.accessToken',
  '*.refreshToken',

  // Secrets that would otherwise ride along in a config or error dump
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'EMAIL_PASSWORD',
  'smtpPassword',
  'emailPassword',
  'secret',
  'apiKey',
  'clientSecret',
];

/** Endpoints too noisy to log on every hit; failures still come through the error path. */
const QUIET_ROUTES = new Set(['/health', '/health/live', '/health/ready', '/favicon.ico']);

export function buildLoggerOptions(config: AppConfig): Params {
  const production = env.isProduction(config);
  const silent = env.isTest(config);

  return {
    pinoHttp: {
      level: silent ? 'silent' : production ? 'info' : 'debug',

      // Pretty output is a development convenience only; production stays newline-delimited JSON so
      // a log shipper can parse it. Tests get neither: a transport is a worker thread, pino starts it
      // during construction regardless of level, and one per application under test is a handle jest
      // has to wait on for nothing — the level is already silent, so there is no output to prettify.
      transport:
        production || silent
          ? undefined
          : {
              target: 'pino-pretty',
              options: {
                singleLine: true,
                colorize: true,
                translateTime: 'SYS:HH:MM:ss',
                ignore: 'pid,hostname,req.headers,res.headers',
              },
            },

      redact: { paths: REDACTED_PATHS, censor: '[Redacted]' },

      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const existing = req.headers['x-request-id'];
        const id = (Array.isArray(existing) ? existing[0] : existing) || randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },

      autoLogging: {
        ignore: (req: IncomingMessage) => QUIET_ROUTES.has((req.url ?? '').split('?')[0]),
      },

      customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },

      // Trimmed serializers: the full header bag is where credentials hide, and the redaction list
      // above is the second line of defence rather than the first.
      serializers: {
        req: (req: { id: unknown; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    },
  };
}
