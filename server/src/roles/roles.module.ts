import { Module } from '@nestjs/common';

import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

/**
 * The roles module.
 *
 * No `PermissionsModule` import: the controller reuses the permission response DTO and the registry
 * helpers, both of which are plain values rather than providers. Keeping the dependency at the type
 * level means the two modules can be loaded independently.
 */
@Module({
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
