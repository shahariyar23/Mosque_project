import { Module } from '@nestjs/common';

import { PrayerTimesModule } from '../prayer-times/prayer-times.module';
import { ReportsModule } from '../reports/reports.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

/**
 * The dashboard module.
 *
 * Two imports, and both of them are the reuse story rather than plumbing.
 *
 * `ReportsModule` supplies `ReportsService`, which is where the headcount and the financial summary already live —
 * the finance figures reach this module through it and originate in `FinancialReportsService`, so the chain runs one
 * way (financial reports → reports → dashboard) and each aggregation is written once. `FinancialReportsModule` is
 * deliberately *not* imported here: going straight to it would create a second path to the same numbers, which is how
 * two implementations of "total donations" eventually appear.
 *
 * `PrayerTimesModule` supplies `PrayerTimesService` for today's schedule. The next Jumu'ah is read from the table
 * directly rather than through `JumuahService`, which offers pagination and CRUD but no "which one is next" — a
 * single indexed `findFirst` is the whole requirement, and importing a module to not use its methods would be
 * misleading.
 *
 * `PrismaModule` and `AuditModule` are not imported: both are `@Global()`, so their services are injectable already
 * and importing them would only add a second path to the same singletons. Nothing is exported — a dashboard is a
 * leaf.
 */
@Module({
  imports: [ReportsModule, PrayerTimesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
