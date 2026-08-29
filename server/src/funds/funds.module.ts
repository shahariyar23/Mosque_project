import { Module } from '@nestjs/common';

import { FundBalanceModule } from '../fund-balance/fund-balance.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FundsController } from './funds.controller';
import { FundsService } from './funds.service';

@Module({
  imports: [PrismaModule, FundBalanceModule],
  controllers: [FundsController],
  providers: [FundsService],
  exports: [FundsService],
})
export class FundsModule {}
