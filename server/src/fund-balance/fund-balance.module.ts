import { Module } from '@nestjs/common';
import { DonationFundsModule } from '../donation-funds/donation-funds.module';
import { FundBalanceController } from './fund-balance.controller';
import { FundBalanceService } from './fund-balance.service';

@Module({
  imports: [DonationFundsModule],
  controllers: [FundBalanceController],
  providers: [FundBalanceService],
  exports: [FundBalanceService],
})
export class FundBalanceModule {}