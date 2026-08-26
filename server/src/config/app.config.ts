import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables, NodeEnv } from './env.validation';

/**
 * Typed accessors over `ConfigService`.
 *
 * `ConfigService.get('KEY')` returns `unknown` and spreads env-variable names through the codebase;
 * these helpers keep the names in one file and hand callers a real type. The validation step has
 * already guaranteed each value is present and well-formed, so every getter is non-optional.
 */
export type AppConfig = ConfigService<EnvironmentVariables, true>;

/**
 * Standalone rather than a method on `env`, because `webUrl` needs it too and a getter that reads
 * `env` from inside `env`'s own initializer is a circular reference TypeScript cannot infer a type
 * through.
 */
function corsOriginList(config: AppConfig): string[] {
  return config
    .get('CORS_ORIGINS', { infer: true })
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: (config: AppConfig): NodeEnv => config.get('NODE_ENV', { infer: true }),

  isProduction: (config: AppConfig): boolean =>
    config.get('NODE_ENV', { infer: true }) === 'production',

  isTest: (config: AppConfig): boolean => config.get('NODE_ENV', { infer: true }) === 'test',

  port: (config: AppConfig): number => config.get('PORT', { infer: true }),

  databaseUrl: (config: AppConfig): string => config.get('DATABASE_URL', { infer: true }),

  accessSecret: (config: AppConfig): string => config.get('JWT_ACCESS_SECRET', { infer: true }),

  accessExpiresIn: (config: AppConfig): string =>
    config.get('JWT_ACCESS_EXPIRES_IN', { infer: true }),

  refreshSecret: (config: AppConfig): string => config.get('JWT_REFRESH_SECRET', { infer: true }),

  refreshExpiresIn: (config: AppConfig): string =>
    config.get('JWT_REFRESH_EXPIRES_IN', { infer: true }),

  refreshCookieName: (config: AppConfig): string =>
    config.get('REFRESH_COOKIE_NAME', { infer: true }),

  cookieDomain: (config: AppConfig): string | undefined =>
    config.get('COOKIE_DOMAIN', { infer: true }),

  /** Split and trimmed; empty entries dropped so a trailing comma is harmless. */
  corsOrigins: (config: AppConfig): string[] => corsOriginList(config),

  /**
   * The base for links sent to people, as opposed to origins the API will accept requests from.
   *
   * Falls back to the first CORS origin, which is the right answer for a single-origin development
   * setup and keeps `APP_WEB_URL` optional. The final fallback exists because the origin list drops
   * empty entries and can therefore return nothing at all — a value of `","` passes `@IsNotEmpty`
   * and yields an empty array, and `new URL(path, undefined)` throws. A password-reset request is
   * not the place to discover that, so it resolves to localhost instead of failing.
   */
  webUrl: (config: AppConfig): string =>
    config.get('APP_WEB_URL', { infer: true }) ??
    corsOriginList(config)[0] ??
    'http://localhost:3000',

  throttleTtl: (config: AppConfig): number => config.get('THROTTLE_TTL', { infer: true }),

  throttleLimit: (config: AppConfig): number => config.get('THROTTLE_LIMIT', { infer: true }),

  swaggerEnabled: (config: AppConfig): boolean => config.get('SWAGGER_ENABLED', { infer: true }),

  emailHost: (config: AppConfig): string => config.get('EMAIL_HOST', { infer: true }),

  emailPort: (config: AppConfig): number => config.get('EMAIL_PORT', { infer: true }),

  emailSecure: (config: AppConfig): boolean => config.get('EMAIL_SECURE', { infer: true }),

  emailUser: (config: AppConfig): string | undefined => config.get('EMAIL_USER', { infer: true }),

  emailPassword: (config: AppConfig): string | undefined =>
    config.get('EMAIL_PASSWORD', { infer: true }),

  emailFrom: (config: AppConfig): string =>
    config.get('EMAIL_FROM', { infer: true }) ?? 'noreply@mostak.tech',

  emailFromName: (config: AppConfig): string =>
    config.get('EMAIL_FROM_NAME', { infer: true }) ?? 'NOOR',

  /** Trailing slash trimmed, so callers can join paths without doubling it. */
  aladhanBaseUrl: (config: AppConfig): string =>
    config.get('ALADHAN_BASE_URL', { infer: true }).replace(/\/+$/, ''),

  aladhanTimeoutMs: (config: AppConfig): number =>
    config.get('ALADHAN_TIMEOUT_MS', { infer: true }),

  prayerCacheTtlSeconds: (config: AppConfig): number =>
    config.get('PRAYER_CACHE_TTL_SECONDS', { infer: true }),
};
