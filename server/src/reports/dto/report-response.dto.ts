import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, VolunteerStatus } from '@prisma/client';

import {
  FinancialSummaryDto,
  ReportRangeDto,
} from '../../financial-reports/dto/financial-report-response.dto';

/**
 * Response shapes for the centralised reports.
 *
 * `ReportRangeDto` and `FinancialSummaryDto` are imported rather than restated. The money side of these reports is
 * `FinancialReportsService`'s work and its DTOs are already the shape a chart wants; a second `range` class with the
 * same two fields would only be a second thing to keep in step.
 *
 * **Two kinds of figure appear here and the difference is deliberate.** A *headcount* — `total`, `active`, `byRole`
 * — answers "how many are there", and ignores `from`/`to` entirely, because how many members a mosque has is not a
 * property of a date window. A *flow* figure — `joined` — answers "how many arrived during the window". Making the
 * headcount range-sensitive would produce a "total members" that shrinks when someone asks about last month, which
 * is the kind of number that gets quoted in a meeting and is wrong.
 *
 * Declaration order matters and is not stylistic: `emitDecoratorMetadata` writes an eager `design:type` reference
 * for a decorated property typed as a single class, so a class used as a property type must be declared before the
 * class using it or it is read inside its temporal dead zone the moment this module loads. Array-typed properties
 * emit `Array` and are safe either way.
 */

/** How many people hold one role. */
export class ReportRoleCountDto {
  @ApiProperty({ enum: Role, example: Role.member })
  role!: Role;

  @ApiProperty({
    example: 128,
    description: 'Headcount now. Zero-count roles are omitted, not zero-filled.',
  })
  count!: number;
}

/** How many volunteers are in one state. */
export class ReportVolunteerStatusCountDto {
  @ApiProperty({ enum: VolunteerStatus, example: VolunteerStatus.active })
  status!: VolunteerStatus;

  @ApiProperty({ example: 17 })
  count!: number;
}

/**
 * The people report.
 *
 * Soft-deleted users are excluded from every figure. A deleted record is retained so the rows that reference it
 * still resolve, not so it can be counted as a member.
 */
export class UserReportDto {
  @ApiProperty({ type: ReportRangeDto })
  range!: ReportRangeDto;

  @ApiProperty({
    example: 412,
    description: 'Headcount now, excluding deleted records. Ignores the range.',
  })
  total!: number;

  @ApiProperty({ example: 389, description: 'Of that headcount, how many can still sign in.' })
  active!: number;

  @ApiProperty({ example: 23, description: '`total` less `active`. Deactivated, not deleted.' })
  inactive!: number;

  @ApiProperty({
    example: 31,
    description:
      'How many of them volunteer. A volunteer is a user, so this is a subset of `total`.',
  })
  volunteers!: number;

  @ApiProperty({
    example: 14,
    description: 'Users created inside the window. Equals `total` when no window was given.',
  })
  joined!: number;

  @ApiProperty({ type: [ReportRoleCountDto], description: 'Headcount by role. Sums to `total`.' })
  byRole!: ReportRoleCountDto[];
}

/**
 * The volunteer report.
 *
 * A `Volunteer` row carries no mosque of its own — it hangs off a user, and the user carries the mosque. Every
 * figure here is therefore scoped through that relation, which also means a volunteer whose user has been
 * soft-deleted drops out, as it should.
 */
export class VolunteerReportDto {
  @ApiProperty({ type: ReportRangeDto })
  range!: ReportRangeDto;

  @ApiProperty({ example: 31, description: 'Volunteers now. Ignores the range.' })
  total!: number;

  @ApiProperty({
    example: 5,
    description:
      'Volunteers who joined inside the window. Equals `total` when no window was given.',
  })
  joined!: number;

  @ApiProperty({
    type: [ReportVolunteerStatusCountDto],
    description: 'Headcount by state. Sums to `total`.',
  })
  byStatus!: ReportVolunteerStatusCountDto[];
}

/**
 * The events report — deliberately empty of figures.
 *
 * There is no events table in this schema yet. The route exists because the brief names it and because a client
 * asking for it should get a documented answer rather than a 404, but every figure is `null` and `tracked` is
 * `false`. Returning `0` instead would be worse than returning nothing: it asserts "this mosque ran no events",
 * which is a claim about the mosque, when the truth is a claim about the software.
 *
 * When an `Event` model lands, this class gains real numbers and `tracked` becomes `true`; nothing else about the
 * route changes, and a client that checked `tracked` keeps working.
 */
export class EventReportDto {
  @ApiProperty({ type: ReportRangeDto })
  range!: ReportRangeDto;

  @ApiProperty({
    example: false,
    description: 'Whether events are recorded at all. `false` means every figure below is `null`.',
  })
  tracked!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Events inside the window. `null` while untracked.',
  })
  total!: number | null;

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
 * Headcount now: how many people, how many can sign in, how many volunteer.
 *
 * Range-independent by definition, which is why it is its own class: the dashboard needs exactly these three and no
 * window at all, so it reads them from `ReportsService` rather than counting the same two tables a second time.
 */
export class ReportHeadcountDto {
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
 * The people block of the combined summary. The headcount plus the one flow figure.
 *
 * Extends rather than restates, so the three headcount fields exist once.
 */
export class ReportUserSummaryDto extends ReportHeadcountDto {
  @ApiProperty({ example: 14, description: 'Joined inside the window.' })
  joined!: number;
}

/** The volunteer block of the combined summary. */
export class ReportVolunteerSummaryDto {
  @ApiProperty({ example: 31 })
  total!: number;

  @ApiProperty({
    example: 26,
    description: 'Volunteers currently available, rather than inactive or on leave.',
  })
  active!: number;

  @ApiProperty({ example: 5, description: 'Joined inside the window.' })
  joined!: number;
}

/**
 * Everything the caller is entitled to see, in one response.
 *
 * **Each block is `null` unless the caller holds the permission for that subject**, and the block is not queried at
 * all in that case — this is not a filter applied to a full result. The route's own `report.view` is the entitlement
 * to *ask*; it is not an entitlement to the mosque's finances or its member directory. That distinction is load
 * bearing: the shipped role map gives an `imam` `report.view` and gives them neither `finance.view` nor `user.view`,
 * so a summary that ignored the per-subject grants would be a route through which any imam reads the payroll.
 *
 * A caller who holds none of them still gets a valid response: the range, and the events block, which says nothing.
 */
export class ReportSummaryDto {
  @ApiProperty({ type: ReportRangeDto })
  range!: ReportRangeDto;

  @ApiPropertyOptional({
    type: () => ReportUserSummaryDto,
    nullable: true,
    description: '`null` unless the caller holds `user.view`.',
  })
  users!: ReportUserSummaryDto | null;

  @ApiPropertyOptional({
    type: () => ReportVolunteerSummaryDto,
    nullable: true,
    description: '`null` unless the caller holds `volunteer.view`.',
  })
  volunteers!: ReportVolunteerSummaryDto | null;

  @ApiPropertyOptional({
    type: () => FinancialSummaryDto,
    nullable: true,
    description:
      '`null` unless the caller holds `finance.view`. Produced by `FinancialReportsService`, so it is the same ' +
      'object `/financial-reports/summary` returns — donations, expenses, salaries, budget and net balance.',
  })
  finance!: FinancialSummaryDto | null;

  @ApiProperty({
    type: () => EventReportDto,
    description: 'Present but untracked. See `EventReportDto`.',
  })
  events!: EventReportDto;
}

/** The envelope every reports endpoint returns. `success` is always true — failures go to the global filter. */
export class ReportSummaryEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Report summary retrieved successfully' })
  message!: string;

  @ApiProperty({ type: ReportSummaryDto })
  data!: ReportSummaryDto;
}

export class UserReportEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'User report retrieved successfully' })
  message!: string;

  @ApiProperty({ type: UserReportDto })
  data!: UserReportDto;
}

export class VolunteerReportEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Volunteer report retrieved successfully' })
  message!: string;

  @ApiProperty({ type: VolunteerReportDto })
  data!: VolunteerReportDto;
}

export class EventReportEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Event report retrieved successfully' })
  message!: string;

  @ApiProperty({ type: EventReportDto })
  data!: EventReportDto;
}
