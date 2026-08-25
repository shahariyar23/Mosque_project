import { Module } from '@nestjs/common';

import { RamadanController } from './ramadan.controller';
import { RamadanService } from './ramadan.service';

/** No imports: `PrismaModule` is `@Global()`, so listing it here would register a second client. */
@Module({
  controllers: [RamadanController],
  providers: [RamadanService],
  exports: [RamadanService],
})
export class RamadanModule {}
