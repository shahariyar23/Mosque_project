import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * Mail module providing Titan Email SMTP transport and template rendering services across the NOOR backend.
 */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
