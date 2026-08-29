import { Module } from '@nestjs/common';

import { FundBalanceModule } from '../fund-balance/fund-balance.module';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

/**
 * Expenses: the money a mosque has spent, booked to a category and a day.
 */
@Module({
  imports: [FundBalanceModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
})
export class ExpensesModule {}
