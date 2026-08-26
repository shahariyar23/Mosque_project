import { Module } from '@nestjs/common';

import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

/**
 * Expenses: the money a mosque has spent, booked to a category and a day.
 *
 * No `imports`. `PrismaModule` is `@Global()`, so importing it here would register a second copy and open a
 * second connection pool.
 *
 * Nothing is exported. Expenses reference no other feature's rows — the category is free text and the author
 * comes from the token — so unlike donations this module reads only its own table and the mosque's settings.
 */
@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService],
})
export class ExpensesModule {}
