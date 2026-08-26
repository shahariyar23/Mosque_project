import { Module } from '@nestjs/common';

import { FinancialReportsModule } from '../financial-reports/financial-reports.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

/**
 * The reports module.
 *
 * `FinancialReportsModule` is the one import, and it is the whole reuse story: every money figure these reports
 * return is produced by `FinancialReportsService`, not recalculated here. That module gained an `exports` entry for
 * it — the single change made to existing code for this feature.
 *
 * `PrismaModule` is not imported: it is `@Global()`, so `PrismaService` is injectable without one and importing it
 * would only add a second path to the same singleton.
 *
 * `ReportsService` is exported for `DashboardModule`, which needs the same people and volunteer counts for its
 * overview. That is the reason the chain runs one way — financial reports, then reports, then dashboard — with each
 * aggregation written once.
 */
@Module({
  imports: [FinancialReportsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
