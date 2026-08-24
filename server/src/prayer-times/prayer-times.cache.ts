import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { env, type AppConfig } from '../config/app.config';
import type { AlAdhanDay } from './aladhan.types';

/**
 * A small in-process cache for calculated days.
 *
 * Scope, stated plainly: this exists so that a page with a prayer widget on it does not send the same
 * request to a third party once per viewer. It is a `Map` with expiry and a size cap — no dependency,
 * no eviction policy worth the name, no cross-instance sharing. That is a deliberate stopping point,
 * not an oversight: the project has no cache infrastructure yet, and choosing Redis on behalf of a
 * feature that needs roughly one entry per mosque per day would be deciding something that isn't this
 * part's to decide. `PrayerTimesService` talks to it through two methods, so replacing it later is a
 * change to this file.
 *
 * What is cached is the *calculated* day, keyed by the inputs AlAdhan was given. The mosque's own
 * adjustments are applied afterwards and are not part of the key — so editing an offset takes effect
 * on the next request, with nothing to invalidate. That is the main reason the split is drawn here.
 */

interface Entry {
  day: AlAdhanDay;
  expiresAt: number;
}

/**
 * Cap on entries. A mosque uses one per day, so this is roughly a year for a single mosque or a month
 * for twelve — comfortably more than any real working set, and small enough that a bug cannot grow it
 * into a memory problem. Eviction is oldest-inserted-first, which `Map` gives for free by preserving
 * insertion order.
 */
const MAX_ENTRIES = 512;

@Injectable()
export class PrayerTimesCache {
  private readonly entries = new Map<string, Entry>();

  constructor(@Inject(ConfigService) private readonly config: AppConfig) {}

  /** Zero TTL turns the cache off, which is what a test or a debugging session wants. */
  private get ttlMs(): number {
    return env.prayerCacheTtlSeconds(this.config) * 1000;
  }

  /**
   * The cache key: every input that changes the calculation, and nothing else.
   *
   * `mosqueId` is deliberately absent. Two mosques on the same street with the same method share an
   * answer, and keying by mosque would fetch it twice.
   */
  static key(parts: {
    date: string;
    latitude: number;
    longitude: number;
    method: number;
    school: number;
    timezone?: string | null;
    tune?: string | null;
  }): string {
    return [
      parts.date,
      // Rounded to the precision the coordinate columns store. Without this, a caller passing
      // 23.8103000001 misses an entry that is the same schedule to the metre.
      parts.latitude.toFixed(6),
      parts.longitude.toFixed(6),
      parts.method,
      parts.school,
      parts.timezone ?? '',
      parts.tune ?? '',
    ].join('|');
  }

  get(key: string, now: number = Date.now()): AlAdhanDay | null {
    if (this.ttlMs <= 0) return null;

    const entry = this.entries.get(key);
    if (!entry) return null;

    if (entry.expiresAt <= now) {
      this.entries.delete(key);
      return null;
    }

    return entry.day;
  }

  set(key: string, day: AlAdhanDay, now: number = Date.now()): void {
    const ttlMs = this.ttlMs;
    if (ttlMs <= 0) return;

    // Re-inserting moves the key to the end of the iteration order, so a refreshed entry is not the
    // next one evicted.
    this.entries.delete(key);
    this.entries.set(key, { day, expiresAt: now + ttlMs });

    while (this.entries.size > MAX_ENTRIES) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
  }

  /** For tests, and for an operator who has just changed a calculation setting globally. */
  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
