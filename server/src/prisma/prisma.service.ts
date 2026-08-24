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
    this.$on('error' as never, (event: { message: string }) => this.logger.error(event.message));

    await this.$connect();
    this.logger.log('Database connection established');
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
