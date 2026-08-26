import { Global, Module } from '@nestjs/common';

import { AuditLogService } from './audit-log.service';
import { AuditLogsController } from './audit-logs.controller';

/**
 * The audit trail.
 *
 * `@Global()`, for the same reason `PrismaModule` is: the brief asks that administrative actions be
 * recorded "from this point forward", which means every future module is a writer. Making each one
 * import this module would be a line of boilerplate per module whose only failure mode is forgetting
 * it — and a module that forgets it does not fail to compile, it silently stops recording. Registering
 * once here means a service asks for `AuditLogService` in its constructor and has it.
 *
 * `PrismaModule` is not imported for the same reason it is not imported anywhere else: it is already
 * global, and a second registration would open a second connection pool.
 */
@Global()
@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditModule {}
