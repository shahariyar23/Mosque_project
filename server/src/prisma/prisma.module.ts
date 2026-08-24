import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global so feature modules can inject `PrismaService` without importing this module each time.
 *
 * A single shared client is deliberate: Prisma manages its own connection pool, and against Neon's
 * pooled endpoint a second client would mean a second pool competing for the same connection budget.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
