import { Module } from '@nestjs/common';

import { DonationFundsController } from './donation-funds.controller';
import { DonationFundsService } from './donation-funds.service';

/**
 * Donation funds: the categories a donation can be directed to.
 *
 * No `imports`. `PrismaModule` is `@Global()`, so importing it here would register a second copy and open
 * a second connection pool.
 *
 * Nothing is exported either. The campaigns module beside this one has to check that a `fundId` belongs to
 * the caller's mosque, and it does that with its own scoped Prisma query rather than by calling this
 * service — one query with a `where` clause, against a dependency between two feature modules that would
 * outlive the reason for it.
 */
@Module({
  controllers: [DonationFundsController],
  providers: [DonationFundsService],
})
export class DonationFundsModule {}
