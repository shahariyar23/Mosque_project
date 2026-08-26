import { Module } from '@nestjs/common';

import { FinancialReportsController } from './financial-reports.controller';
import { FinancialReportsService } from './financial-reports.service';

/**
 * The financial reports module.
 *
 * No `imports`: `PrismaModule` is `@Global()`, so `PrismaService` is injectable without one, and importing it here
 * would only add a second path to the same singleton.
 *
 * Nothing else either. In particular this does **not** import `DonationsModule`, `ExpensesModule`, `BudgetsModule`
 * or `SalariesModule`, even though it reports on all four tables. Those services return paginated rows of DTOs,
 * which is the opposite of what a report needs — a total must come from the database's `SUM`, not from fetching
 * pages and adding them up. So the service queries the tables directly and aggregates there. The cost is that this
 * module knows four schemas; the alternative would have been to load every transaction into memory to count it.
 *
 * `FinancialReportsService` is exported for `ReportsModule`, which serves the centralised `/reports/*` endpoints and
 * delegates every money figure to it rather than aggregating the same four tables a second time. Two
 * implementations of "total donations this quarter" would be two answers to one question, and the day they disagreed
 * the mosque would have no way to tell which was lying. Nothing else reads a report.
 */
@Module({
  controllers: [FinancialReportsController],
  providers: [FinancialReportsService],
  exports: [FinancialReportsService],
})
export class FinancialReportsModule {}
