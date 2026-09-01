import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * The Prisma client, as an injectable Nest provider.
 *
 * Connecting in `onModuleInit` rather than lazily on first query means a bad `DATABASE_URL` or an
 * unreachable database fails at startup, where it is obvious, instead of turning the first request
 * into a 500.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      // `warn` and `error` only. Prisma's `query` event logs interpolated parameters, which for this
      // API would put donor details — and on sign-in, a password hash — into the logs.
      log: [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
      errorFormat: 'minimal',
    });
  }

  async onModuleInit(): Promise<void> {
    this.$on('warn' as never, (event: { message: string }) => this.logger.warn(event.message));
    this.$on('error' as never, (event: { message: string }) => {
      if (event.message?.includes('kind: Closed') || event.message?.includes('Closed')) {
        this.logger.debug(`Idle database connection closed by server/pooler: ${event.message}`);
        return;
      }
      this.logger.error(event.message);
    });

    const maxRetries = 5;
    const retryDelayMs = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Database connection established');
        return;
      } catch (err: any) {
        if (attempt === maxRetries) {
          this.logger.error(
            `Failed to connect to database after ${maxRetries} attempts: ${err.message}`,
          );
          throw err;
        }
        this.logger.warn(
          `Database connection attempt ${attempt}/${maxRetries} failed (${err.message}). Retrying in ${retryDelayMs / 1000}s (waking up serverless database)...`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * True when the database answers. Used by the readiness probe.
   *
   * `SELECT 1` rather than a table read so the check stays meaningful before the first migration and
   * cannot be broken by a schema change.
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error(
        `Database health check failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return false;
    }
  }
}
