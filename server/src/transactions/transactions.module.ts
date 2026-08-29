import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { FundBalanceModule } from '../fund-balance/fund-balance.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [PrismaModule, AuditModule, FundBalanceModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
