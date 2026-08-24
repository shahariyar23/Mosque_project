import { Module } from '@nestjs/common';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * The users module.
 *
 * `PrismaModule` is not imported: it is registered `@Global()`, so `PrismaService` injects here
 * without it, and a second registration would create a second client with its own connection pool.
 *
 * `UsersService` is exported because the auth module will need to look a person up by address in order
 * to sign them in, and that lookup belongs to this module rather than being a second Prisma query
 * written somewhere else against the same table.
 */
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
