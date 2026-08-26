import { Module } from '@nestjs/common';

import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';

/**
 * The approvals module.
 *
 * Neither `PrismaModule` nor `AuditModule` is imported: both are `@Global()`, and importing a global
 * module again creates a second provider instance rather than reusing the one everything else shares.
 *
 * Nothing is exported. No other module reads or writes an approval today — the brief asks for a system
 * that *can* be used by expenses, salary, donations and events later, and the thing that makes it usable
 * is the generic `entity`/`entityId` pair on the row, not a provider handed round now. When the first
 * module does need to ask "is anything outstanding against this?", adding `exports: [ApprovalsService]`
 * here is the whole change, and until then an export would be configuration nothing reads.
 */
@Module({
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
})
export class ApprovalsModule {}
