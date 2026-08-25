import { Module } from '@nestjs/common';

import { AlAdhanClient } from './aladhan.client';
import { PrayerTimesCache } from './prayer-times.cache';
import { PrayerTimesController } from './prayer-times.controller';
import { PrayerTimesService } from './prayer-times.service';

/**
 * Prayer times, and the AlAdhan integration behind them.
 *
 * No imports: `PrismaModule` is `@Global()` and `ConfigModule` is registered globally in
 * `app.module.ts`, so listing either here would register a second copy of a provider that already
 * exists — which for the cache would mean two `Map`s and a hit rate of roughly half what it looks like.
 *
 * `PrayerTimesService` is exported because the Ramadan module will eventually want calculated Suhoor
 * and Iftar times from the same integration rather than a second one. Nothing consumes it yet.
 */
@Module({
  controllers: [PrayerTimesController],
  providers: [PrayerTimesService, AlAdhanClient, PrayerTimesCache],
  exports: [PrayerTimesService],
})
export class PrayerTimesModule {}
