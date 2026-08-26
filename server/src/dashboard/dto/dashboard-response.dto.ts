import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { FinancialSummaryDto } from '../../financial-reports/dto/financial-report-response.dto';
import { JumuahDto } from '../../jumuah/dto/jumuah.dto';

/**
 * The overview response.
 *
 * **There is no dashboard table and there is no dashboard row.** Every figure here is a `count` or an `aggregate`
 * against tables other modules own, run at request time. A stored overview would be a cache with no invalidation
 * story, quietly wrong between writes, and the first thing anyone would stop trusting.
 *
 * **Every block is nullable and `null` means "not shown to you", not "zero".** A block the caller lacks the
 * permission for is never queried, so it cannot leak. `dashboard.view` is the entitlement to *see a dashboard*; it
 * is not an entitlement to the mosque's finances. The shipped role map makes that concrete: an `imam` and a
 * `cashier` both hold `dashboard.view`, and neither holds `user.view`; the imam holds no finance grant at all. A
 * single overview endpoint that ignored the per-subject grants would be a way for both of them to read the payroll.
 *
 * Two blocks carry a `tracked` flag instead of figures, because the tables they would count do not exist in this
 * schema yet. They return `null`, not `0`: a zero asserts something about the mosque, when the truth is something
 * about the software.
 *
 * `FinancialSummaryDto` and `JumuahDto` are imported rather than restated — the finance block *is* the financial
 * summary, and the next Jumu'ah *is* a Jumu'ah row, and a parallel copy of either would be a second thing to keep
 * in step.
 *
 * Declaration order matters: `emitDecoratorMetadata` writes an eager `design:type` reference for a decorated
 * property typed as a single class, so a class used as a property type must be declared before the class using it.
 */

/** The five obligatory prayers, adjusted, as `HH:mm` in the mosque's timezone. */
export class DashboardPrayerTimingsDto {
  @ApiProperty({ example: '04:42' }) fajr!: string;
  @ApiProperty({ example: '12:05' }) dhuhr!: string;
  @ApiProperty({ example: '16:28' }) asr!: string;
  @ApiProperty({ example: '18:12' }) maghrib!: string;
  @ApiProperty({ example: '19:31' }) isha!: string;
}

/**
 * Today's schedule, trimmed to what a dashboard shows.
 *
 * The five obligatory prayers and nothing else. `/prayer-times` returns imsak, sunrise, sunset, midnight, the Hijri
 * date, the coordinates and the calculation method as well, which is the right answer for a prayer-times page and
 * roughly four times the payload a summary card needs.
 */
export class DashboardPrayerDto {
  @ApiProperty({
    format: 'date',
    example: '2026-08-26',
    description: 'Today in the mosque’s timezone.',
  })
  date!: string;

  @ApiProperty({ example: 'Asia/Dhaka' })
  timezone!: string;

  @ApiProperty({
    type: DashboardPrayerTimingsDto,
    description: 'Adjusted times, as the mosque publishes them.',
  })
  timings!: DashboardPrayerTimingsDto;
}

/** Headcount. Exactly the three figures the brief asks for. */
export class DashboardUsersDto {
  @ApiProperty({
    example: 412,
    description: 'Users in this mosque, excluding soft-deleted records.',
  })
  total!: number;

  @ApiProperty({ example: 389, description: 'Of those, how many can still sign in.' })
  active!: number;

  @ApiProperty({ example: 31, description: 'How many volunteer. A subset of `total`.' })
  volunteers!: number;
}

/**
 * Events — present, untracked.
 *
 * No `Event` model exists in this schema, so `tracked` is `false` and both figures are `null`. When the model lands
 * this block gains real numbers **and must gain a permission gate**; until then there is nothing to gate, because
 * there is nothing to disclose.
 */
export class DashboardEventsDto {
  @ApiProperty({ example: false, description: '`false` means every figure below is `null`.' })
  tracked!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Events still to come. `null` while untracked.',
  })
  upcoming!: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Registrations taken. `null` while untracked.',
  })
  registrations!: number | null;
}

/**
 * Published content — present, untracked.
 *
 * No `Article` or `Khutbah` model exists in this schema. Same reasoning as `DashboardEventsDto`: the block is
 * declared so the shape is stable and the omission is visible, and it will need `article.view` and `khutbah.view`
 * gates the moment it has anything to report.
 */
export class DashboardContentDto {
  @ApiProperty({ example: false, description: '`false` means every figure below is `null`.' })
  tracked!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Published articles. `null` while untracked.',
  })
  publishedArticles!: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Published khutbahs. `null` while untracked.',
  })
  publishedKhutbahs!: number | null;
}

/** What is waiting for somebody. One indexed count. */
export class DashboardApprovalsDto {
  @ApiProperty({ example: 3, description: 'Requests in this mosque still awaiting a decision.' })
  pending!: number;
}

/**
 * One mosque, right now.
 *
 * `generatedAt` is here because everything else is a live figure with no window: without a timestamp, a screenshot
 * of this response says nothing about when it was true.
 */
export class DashboardOverviewDto {
  @ApiProperty({ format: 'date-time', description: 'When these figures were read.' })
  generatedAt!: string;

  @ApiPropertyOptional({
    type: () => DashboardUsersDto,
    nullable: true,
    description: '`null` unless the caller holds `user.view`.',
  })
  users!: DashboardUsersDto | null;

  @ApiPropertyOptional({
    type: () => FinancialSummaryDto,
    nullable: true,
    description:
      '`null` unless the caller holds `finance.view`. All-time totals — donations, expenses, salaries, budget and ' +
      'net balance — produced by `FinancialReportsService` with no window applied.',
  })
  finance!: FinancialSummaryDto | null;

  @ApiPropertyOptional({
    type: () => DashboardPrayerDto,
    nullable: true,
    description:
      '`null` if the caller cannot read the prayer schedule, **or if the upstream calculation was unavailable**. ' +
      'The dashboard degrades rather than failing: a third party being down must not take the overview with it.',
  })
  prayer!: DashboardPrayerDto | null;

  @ApiPropertyOptional({
    type: () => JumuahDto,
    nullable: true,
    description:
      'The next dated Friday entry, or the standing weekly schedule if none is dated. `null` when the mosque has ' +
      'published no Jumu’ah schedule at all.',
  })
  jumuah!: JumuahDto | null;

  @ApiProperty({ type: () => DashboardEventsDto, description: 'Present but untracked.' })
  events!: DashboardEventsDto;

  @ApiProperty({ type: () => DashboardContentDto, description: 'Present but untracked.' })
  content!: DashboardContentDto;

  @ApiPropertyOptional({
    type: () => DashboardApprovalsDto,
    nullable: true,
    description: '`null` unless the caller holds `workflow.review`.',
  })
  approvals!: DashboardApprovalsDto | null;
}

/** The envelope the overview returns. `success` is always true — failures go to the global filter. */
export class DashboardOverviewEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Dashboard overview retrieved successfully' })
  message!: string;

  @ApiProperty({ type: DashboardOverviewDto })
  data!: DashboardOverviewDto;
}
