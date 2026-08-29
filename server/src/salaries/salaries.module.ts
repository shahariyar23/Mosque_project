import { Module } from '@nestjs/common';

import { FundBalanceModule } from '../fund-balance/fund-balance.module';
import { SalariesController } from './salaries.controller';
import { SalariesService } from './salaries.service';

/**
 * Wires the salary endpoints.
 */
@Module({
  imports: [FundBalanceModule],
  controllers: [SalariesController],
  providers: [SalariesService],
})
export class SalariesModule {}
