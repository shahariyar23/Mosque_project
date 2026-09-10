import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsController } from './events.controller';
import { RegistrationsController } from './registrations.controller';
import { EventsService } from './events.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [EventsController, RegistrationsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
