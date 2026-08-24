import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

/**
 * The environment, validated once at boot.
 *
 * Every value the application reads is declared here. A missing or malformed variable stops the
 * process with a readable list of problems rather than surfacing as an obscure failure on the first
 * request that happens to need it — which for a JWT secret or a database URL would otherwise be at
 * sign-in time, in front of a person.
 *
 * Nothing in this file is ever logged: `ConfigService` holds the parsed result and the logger
 * redacts the keys that matter (see `logger.config.ts`).
 */

export type NodeEnv = 'development' | 'test' | 'production';

const DURATION = /^\d+(ms|s|m|h|d)$/;

export class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: NodeEnv = 'development';

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 4000;

  /**
   * Postgres connection string. Prisma reads this directly too, so the name is fixed.
   * Required with no fallback: a default here would silently point a developer at the wrong database.
   */
  @IsString()
  @IsNotEmpty()
  @Matches(/^postgres(ql)?:\/\//, {
    message: 'DATABASE_URL must be a postgresql:// connection string',
  })
  DATABASE_URL!: string;

  /**
   * Signing secrets. Long minimum because these are the whole of the token security story, and
   * distinct from each other so a leaked access secret cannot be used to mint refresh tokens
   * (enforced in `validateEnvironment` below, which can compare the two).
   */
  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET must be at least 32 characters' })
  JWT_ACCESS_SECRET!: string;

  @Matches(DURATION, { message: 'JWT_ACCESS_EXPIRES_IN must look like 15m, 3600s or 1h' })
  JWT_ACCESS_EXPIRES_IN = '15m';

  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET must be at least 32 characters' })
  JWT_REFRESH_SECRET!: string;

  @Matches(DURATION, { message: 'JWT_REFRESH_EXPIRES_IN must look like 7d or 168h' })
  JWT_REFRESH_EXPIRES_IN = '7d';

  @IsString()
  @IsNotEmpty()
  REFRESH_COOKIE_NAME = 'noor_refresh';

  /** Blank means a host-only cookie, which is what you want in development. */
  @IsOptional()
  @IsString()
  COOKIE_DOMAIN?: string;

  /**
   * Comma-separated exact origins. Deliberately not a wildcard: the refresh token travels in a
   * credentialed cookie, and `origin: '*'` cannot be combined with credentials anyway.
   */
  @IsString()
  @IsNotEmpty()
  CORS_ORIGINS = 'http://localhost:3000';

  /**
   * Where the browser application lives, used to build links that are sent to people rather than
   * returned to a caller — today only the password-reset link.
   *
   * Separate from `CORS_ORIGINS` on purpose. That variable is a security allow-list and is routinely
   * several entries long: a staging host, a preview deployment, a second local port. Reading a link
   * base out of it means the address in someone's inbox is decided by whichever origin happens to be
   * written first, which is not a property anyone maintaining that list would expect to be choosing.
   * Optional, because falling back to the first origin is right for a single-origin development
   * setup and keeps existing `.env` files working; set it explicitly anywhere that matters.
   */
  @IsOptional()
  @IsString()
  @Matches(/^https?:\/\/[^\s]+$/, {
    message: 'APP_WEB_URL must be an absolute http:// or https:// URL, e.g. https://noor.example',
  })
  APP_WEB_URL?: string;

  @IsInt()
  @Min(1)
  THROTTLE_TTL = 60;

  @IsInt()
  @Min(1)
  THROTTLE_LIMIT = 120;

  @IsBoolean()
  SWAGGER_ENABLED = true;

  /**
   * The AlAdhan prayer-time API. Configured rather than hardcoded for the ordinary reason that a
   * third-party host is an operational fact and not a source-code one: it lets a deployment point at
   * a mirror or a self-hosted instance, and it lets a test point at a local stub without patching
   * globals. The default is the public service, so nothing has to be set to run.
   */
  @IsString()
  @Matches(/^https?:\/\/[^\s]+$/, {
    message: 'ALADHAN_BASE_URL must be an absolute http:// or https:// URL',
  })
  ALADHAN_BASE_URL = 'https://api.aladhan.com/v1';

  /**
   * How long to wait on AlAdhan before giving up. Bounded at both ends: below a second is a timeout
   * that fires on a healthy connection, and above thirty the caller is left holding a request that a
   * proxy will have abandoned anyway. A prayer schedule is not worth blocking a worker on.
   */
  @IsInt()
  @Min(1000)
  @Max(30000)
  ALADHAN_TIMEOUT_MS = 8000;

  /**
   * How long a normalized day's times stay cached. A calculated schedule for a fixed date and
   * location does not change, so this could be very long; it is a day by default because the mosque's
   * own offsets *can* change, and a stale entry that outlives the working day would be confusing.
   */
  @IsInt()
  @Min(0)
  PRAYER_CACHE_TTL_SECONDS = 86400;
}

/** `"1" | "true" | "yes" | "on"` → true. Anything else present → false. */
function toBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  // A class default arrives as a real boolean; everything from the environment arrives as a string.
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function toInt(value: unknown, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
}

/**
 * Coerces the raw `process.env` strings into typed values and validates them.
 *
 * Registered as `ConfigModule`'s `validate`, so it runs before any provider is constructed.
 */
export function validateEnvironment(raw: Record<string, unknown>): EnvironmentVariables {
  const defaults = new EnvironmentVariables();

  const config = plainToInstance(
    EnvironmentVariables,
    {
      ...raw,
      PORT: toInt(raw.PORT, defaults.PORT),
      THROTTLE_TTL: toInt(raw.THROTTLE_TTL, defaults.THROTTLE_TTL),
      THROTTLE_LIMIT: toInt(raw.THROTTLE_LIMIT, defaults.THROTTLE_LIMIT),
      SWAGGER_ENABLED: toBoolean(raw.SWAGGER_ENABLED, defaults.SWAGGER_ENABLED),
      ALADHAN_TIMEOUT_MS: toInt(raw.ALADHAN_TIMEOUT_MS, defaults.ALADHAN_TIMEOUT_MS),
      PRAYER_CACHE_TTL_SECONDS: toInt(
        raw.PRAYER_CACHE_TTL_SECONDS,
        defaults.PRAYER_CACHE_TTL_SECONDS,
      ),
      // Blank falls back to the default rather than failing the URL check, so a commented-out line
      // in .env means "use the public API" instead of stopping boot.
      ALADHAN_BASE_URL: raw.ALADHAN_BASE_URL === '' ? undefined : raw.ALADHAN_BASE_URL,
      COOKIE_DOMAIN: raw.COOKIE_DOMAIN === '' ? undefined : raw.COOKIE_DOMAIN,
      // An empty value has to become absent rather than fail the URL check, so that a commented-out
      // or blank line in .env means "use the fallback" instead of stopping boot.
      APP_WEB_URL: raw.APP_WEB_URL === '' ? undefined : raw.APP_WEB_URL,
    },
    { enableImplicitConversion: false, exposeDefaultValues: true },
  );

  const errors = validateSync(config, {
    skipMissingProperties: false,
    whitelist: false,
    forbidUnknownValues: true,
  });

  const problems = errors.flatMap((error) => Object.values(error.constraints ?? {}));

  // Checks that need two fields at once, so they cannot be expressed as a single decorator.
  if (config.JWT_ACCESS_SECRET && config.JWT_ACCESS_SECRET === config.JWT_REFRESH_SECRET) {
    problems.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values');
  }

  if (config.NODE_ENV === 'production' && config.CORS_ORIGINS.includes('*')) {
    problems.push('CORS_ORIGINS must list exact origins in production — "*" is not allowed');
  }

  if (problems.length > 0) {
    // The names of the offending variables are safe to print; their values are not, and no
    // constraint message above interpolates one.
    throw new Error(
      `Invalid environment configuration:\n  - ${problems.join('\n  - ')}\n\n` +
        'See server/.env.example for the expected shape.',
    );
  }

  return config;
}
