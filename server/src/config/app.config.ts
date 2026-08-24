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
  corsOrigins: (config: AppConfig): string[] =>
    config
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),

  throttleTtl: (config: AppConfig): number => config.get('THROTTLE_TTL', { infer: true }),

  throttleLimit: (config: AppConfig): number => config.get('THROTTLE_LIMIT', { infer: true }),

  swaggerEnabled: (config: AppConfig): boolean => config.get('SWAGGER_ENABLED', { infer: true }),
};
