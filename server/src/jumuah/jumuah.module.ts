import { Module } from '@nestjs/common';

import { JumuahController } from './jumuah.controller';
import { JumuahService } from './jumuah.service';

/** No imports: `PrismaModule` is `@Global()`, so listing it here would register a second client. */
@Module({
  controllers: [JumuahController],
  providers: [JumuahService],
  exports: [JumuahService],
})
export class JumuahModule {}
