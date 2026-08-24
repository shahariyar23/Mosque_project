import { Module } from '@nestjs/common';

import { VolunteersController } from './volunteers.controller';
import { VolunteersService } from './volunteers.service';

/**
 * The volunteers module.
 *
 * `PrismaModule` is not imported: it is registered `@Global()`, so `PrismaService` injects here without
 * it, and a second registration would create a second client with its own connection pool.
 *
 * `UsersModule` is not imported either. This module reads the person through the Prisma relation rather
 * than by calling `UsersService`, because it needs a user *nested inside a volunteer query* — one round
 * trip that filters and pages on both tables at once, which a service call cannot express.
 *
 * `VolunteersService` is not exported. Nothing else needs the roster yet, and events and assignments are
 * out of scope for this part; when something does, exporting it is one line.
 */
@Module({
  controllers: [VolunteersController],
  providers: [VolunteersService],
})
export class VolunteersModule {}
