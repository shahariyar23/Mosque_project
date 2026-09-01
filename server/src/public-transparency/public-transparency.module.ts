import { Module } from '@nestjs/common';
import { PublicTransparencyController } from './public-transparency.controller';
import { PublicTransparencyService } from './public-transparency.service';

@Module({
  controllers: [PublicTransparencyController],
  providers: [PublicTransparencyService],
  exports: [PublicTransparencyService],
})
export class PublicTransparencyModule {}
