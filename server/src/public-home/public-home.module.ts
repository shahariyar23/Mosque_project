import { Module } from '@nestjs/common';

import { AnnouncementsModule } from '../announcements/announcements.module';
import { EventsModule } from '../events/events.module';
import { JumuahModule } from '../jumuah/jumuah.module';
import { PrayerTimesModule } from '../prayer-times/prayer-times.module';
import { PublicTransparencyModule } from '../public-transparency/public-transparency.module';
import { ServicesModule } from '../services/services.module';
import { PublicHomeController } from './public-home.controller';
import { PublicMosquesController } from './public-mosques.controller';
import { PublicHomeService } from './public-home.service';

@Module({
  imports: [
    PrayerTimesModule,
    JumuahModule,
    ServicesModule,
    EventsModule,
    AnnouncementsModule,
    PublicTransparencyModule,
  ],
  controllers: [PublicHomeController, PublicMosquesController],
  providers: [PublicHomeService],
})
export class PublicHomeModule {}
