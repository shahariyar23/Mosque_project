import { Module } from '@nestjs/common';

import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';

/**
 * Donations: the money a mosque has received, recorded against a fund and optionally against a campaign.
 *
 * No `imports`. `PrismaModule` is `@Global()`, so importing it here would register a second copy and open a
 * second connection pool.
 *
 * Nothing is exported. The service reads the funds, campaigns and users tables directly — one `findFirst`
 * each, scoped by `mosqueId`, to check the ids a caller supplied — rather than importing three feature
 * services for three queries.
 */
@Module({
  controllers: [DonationsController],
  providers: [DonationsService],
})
export class DonationsModule {}
