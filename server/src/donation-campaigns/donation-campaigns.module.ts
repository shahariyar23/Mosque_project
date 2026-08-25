import { Module } from '@nestjs/common';

import { DonationCampaignsController } from './donation-campaigns.controller';
import { DonationCampaignsService } from './donation-campaigns.service';

/**
 * Campaigns: the individual fundraising appeals a mosque runs, optionally filed under a donation fund.
 *
 * No `imports`. `PrismaModule` is `@Global()`, so importing it here would register a second copy and open a
 * second connection pool.
 *
 * Nothing is exported. This module reads the donation-funds table directly — one `findFirst` scoped by
 * `mosqueId`, to check a `fundId` belongs to the caller — rather than importing `DonationFundsService`,
 * which would create a dependency between two feature modules for a single query.
 */
@Module({
  controllers: [DonationCampaignsController],
  providers: [DonationCampaignsService],
})
export class DonationCampaignsModule {}
