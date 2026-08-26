import { Module } from '@nestjs/common';

import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';

/**
 * Wires the budgets endpoints.
 *
 * No `imports`: `PrismaModule` is `@Global()`, so `PrismaService` is already injectable here, and the guards
 * that enforce `budget.view` and `budget.manage` are registered globally in `AppModule`.
 *
 * Nothing is exported. The financial reports read the `budgets` table through Prisma directly rather than
 * through `BudgetsService`, because they need aggregates over many rows and this service returns paginated
 * response DTOs — one page of `BudgetResponseDto` is the wrong shape to sum, and summing in memory is what the
 * reports are written to avoid.
 */
@Module({
  controllers: [BudgetsController],
  providers: [BudgetsService],
})
export class BudgetsModule {}
