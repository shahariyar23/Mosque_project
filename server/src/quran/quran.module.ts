import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { QuranResourcesController } from './quran-resources.controller';
import { QuranResourcesService } from './quran-resources.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [QuranResourcesController],
  providers: [QuranResourcesService],
  exports: [QuranResourcesService],
})
export class QuranModule {}
