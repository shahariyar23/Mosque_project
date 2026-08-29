import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { FundBalanceModule } from '../fund-balance/fund-balance.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FundTransfersController } from './fund-transfers.controller';
import { FundTransfersService } from './fund-transfers.service';

@Module({
  imports: [PrismaModule, AuditModule, FundBalanceModule],
  controllers: [FundTransfersController],
  providers: [FundTransfersService],
  exports: [FundTransfersService],
})
export class FundTransfersModule {}
