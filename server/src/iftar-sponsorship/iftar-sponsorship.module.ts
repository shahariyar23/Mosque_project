import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { IftarSponsorshipController } from './iftar-sponsorship.controller';
import { IftarSponsorshipService } from './iftar-sponsorship.service';

@Module({
  imports: [PrismaModule, AuditModule, MailModule],
  controllers: [IftarSponsorshipController],
  providers: [IftarSponsorshipService],
  exports: [IftarSponsorshipService],
})
export class IftarSponsorshipModule {}

