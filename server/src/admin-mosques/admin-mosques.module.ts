import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminMosquesController } from './admin-mosques.controller';
import { AdminMosquesService } from './admin-mosques.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AdminMosquesController],
  providers: [AdminMosquesService],
  exports: [AdminMosquesService],
})
export class AdminMosquesModule {}

