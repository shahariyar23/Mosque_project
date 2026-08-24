import { Module } from '@nestjs/common';

import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

/**
 * The permissions module.
 *
 * `PermissionsService` is exported because other modules will want to describe a permission they hold
 * a string for. It reads only compile-time constants, so sharing the instance costs nothing.
 */
@Module({
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
