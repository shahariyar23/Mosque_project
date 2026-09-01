import { Module } from '@nestjs/common';

import { JummahCollectionsController } from './jummah-collections.controller';
import { JummahCollectionsService } from './jummah-collections.service';
import { JumuahController } from './jumuah.controller';
import { JumuahService } from './jumuah.service';

/** No imports: `PrismaModule` is `@Global()`, so listing it here would register a second client. */
@Module({
  controllers: [JummahCollectionsController, JumuahController],
  providers: [JumuahService, JummahCollectionsService],
  exports: [JumuahService, JummahCollectionsService],
})
export class JumuahModule {}

