import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalStatus, Prisma } from '@prisma/client';

import { AuditLogService } from '../audit/audit-log.service';
import { effectivePermissions, hasPermission } from '../common/constants/roles';
import { MAX_PAGE_SIZE } from '../common/pagination/page';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { dayAfter, toDateOnly } from '../common/utils/date-only';
import { PrismaService } from '../prisma/prisma.service';
import { ApprovalQueryDto } from './dto/approval-query.dto';
import { ApprovalListMetaDto, ApprovalResponseDto } from './dto/approval-response.dto';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { DecideApprovalDto } from './dto/decide-approval.dto';
import {
  APPROVAL_SELECT,
  DEFAULT_APPROVAL_PAGE_SIZE,
  type SelectedApproval,
} from './types/approval.types';

/**
 * Raising a request for review, and deciding one.
 *
 * This is a review record, not a workflow engine. There are no stages, no routing rules, no parallel
 * reviewers, no escalation and no state machine beyond the four values of the enum. Something is
 * proposed, and then somebody with the authority to do so accepts or declines it. Everything below is a
 * consequence of keeping it that small.
 *
 * **Nothing here executes anything.** An approved request is a recorded permission to act, not the act.
 * The module that owns the target still performs the operation, still checks its own permissions when it
 * does, and is the only thing that knows how. Wiring an approval to a side effect would make this table
 * the most dangerous one in the schema — a row that pays a salary — and would couple it to every module
 * it is meant to be independent of.
 *
 * **Three rules are enforced here rather than by the database.** A decided request cannot be decided
 * again; there may be only one pending request against a target at a time; and a requester may not
 * decide their own request. The first two could in principle be constraints, but Prisma cannot express a
 * partial unique index, so writing one by hand would leave the database permanently drifted from
 * `schema.prisma` and make every later `migrate dev` offer a destructive reset. The third could not be a
 * constraint in any case, because the exemption depends on a permission.
 *
 * **The self-approval rule is a permission, not a code path.** `workflow.selfApprove` already exists in
 * the registry and is already in `PLATFORM_ONLY`, so the only role holding it is `super_admin`. That
 * makes "the requester must not approve their own request" enforceable as "refuse unless the caller
 * holds the grant that says otherwise", which is checked the same way as every other authority in this
 * codebase and needs no role name compared anywhere. It also matters that `mosque_admin` does *not*
 * hold it: the person who runs the mosque can approve other people's requests and not their own, which
 * is the whole point of a second pair of eyes.
 *
 * **A decision is one atomic update.** `status`, `reviewedById`, `reviewedAt` and `comment` are written
 * together, filtered on `status: pending`, so two reviewers pressing approve and reject at the same
 * moment cannot both win — the second gets a 409 rather than overwriting the first.
 *
 * Reads are scoped in the `where` clause, and an unreachable row answers 404 rather than 403, for the
 * reason `DonationFundsService` gives: a 403 confirms the record exists. A holder of `platform.manage`
 * reads and decides across mosques, which is the same exception the audit trail makes and for the same
 * reason — they administer across mosques, and would otherwise be locked out of the queue they created.
 */
@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  /**
   * Raises a request in the caller's own mosque.
   *
   * `mosqueId` and `requestedById` both come from the token. Neither is in the DTO: a body that could
   * name the requester would defeat the only rule this module exists to enforce, since a caller could
   * raise a request in someone else's name and then approve it themselves without ever being the
   * requester.
   *
   * A second pending request over the same target is refused. Two rows saying "may I pay this invoice"
   * is not a queue, it is a way for the same invoice to be approved twice.
   */
  async create(actor: AuthenticatedUser, dto: CreateApprovalDto): Promise<ApprovalResponseDto> {
    await this.assertNothingPending(actor.mosqueId, dto);

    let created: SelectedApproval;

    try {
      created = await this.prisma.approvalRequest.create({
        // Field by field rather than spread from the DTO: a property added to the DTO later cannot
        // reach the database until somebody names it here.
        data: {
          mosqueId: actor.mosqueId,
          requestedById: actor.id,
          entity: dto.entity,
          entityId: dto.entityId.trim(),
          action: dto.action,
          reason: dto.reason?.trim() ?? null,
          // `status` is left to the column default, `pending`. Raising a request is what makes it
          // pending, so there is nothing to decide here.
        },
        select: APPROVAL_SELECT,
      });
    } catch (error) {
      throw this.translate(error);
    }

    // After the write has committed, never inside it — see `AuditLogService`. A trail entry that could
    // roll back the thing it records would be worse than a missing one.
    await this.audit.record({
      mosqueId: created.mosqueId,
      action: 'APPROVAL_REQUESTED',
      resource: 'approval',
      resourceId: created.id,
      actorId: actor.id,
      // The token carries no display name, so the email is what names the actor. `AuditEntry` says so.
      actorName: actor.email,
      actorRole: actor.role,
      changes: { entity: created.entity, entityId: created.entityId, action: created.action },
      note: created.reason,
    });

    return ApprovalResponseDto.from(created);
  }

  async findMany(
    actor: AuthenticatedUser,
    query: ApprovalQueryDto,
  ): Promise<{ rows: ApprovalResponseDto[]; meta: ApprovalListMetaDto }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? DEFAULT_APPROVAL_PAGE_SIZE), MAX_PAGE_SIZE);

    this.assertRange(query.from, query.to);

    const where = this.buildWhere(actor, query);

    // One transaction so the count and the page describe the same set of rows. A review queue is
    // written to while it is being read, which is exactly when the two would otherwise disagree.
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.approvalRequest.count({ where }),
      this.prisma.approvalRequest.findMany({
        where,
        select: APPROVAL_SELECT,
        // Pending first, then newest first. The enum is declared `pending, approved, rejected,
        // cancelled`, and Postgres orders an enum by declaration order, so ascending status puts the
        // outstanding work at the top without a second query or a sort in JavaScript. `id` breaks ties
        // so a request cannot appear on two pages, or on none, when several share a timestamp.
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      rows: rows.map((row) => ApprovalResponseDto.from(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(actor: AuthenticatedUser, id: string): Promise<ApprovalResponseDto> {
    return ApprovalResponseDto.from(await this.getReachable(actor, id));
  }

  /** Accepts a pending request. Requires `workflow.approve`, declared on the route. */
  async approve(
    actor: AuthenticatedUser,
    id: string,
    dto: DecideApprovalDto,
  ): Promise<ApprovalResponseDto> {
    return this.decide(actor, id, ApprovalStatus.approved, dto);
  }

  /** Declines a pending request. Same authority as approving — deciding is one grant, not two. */
  async reject(
    actor: AuthenticatedUser,
    id: string,
    dto: DecideApprovalDto,
  ): Promise<ApprovalResponseDto> {
    return this.decide(actor, id, ApprovalStatus.rejected, dto);
  }

  // ---- internals ------------------------------------------------------------

  /**
   * The one write path for both decisions.
   *
   * Approving and rejecting differ only in the value stored, so they share this: the ownership check,
   * the self-approval rule, the already-decided rule, the atomic update and the audit entry are all
   * identical, and two copies of them would be two places for one of the four to be forgotten.
   */
  private async decide(
    actor: AuthenticatedUser,
    id: string,
    // Prisma emits enums as const objects rather than TypeScript `enum`s, so `ApprovalStatus.approved` is a value
    // and not a type. `Extract` narrows the union to the two decisions this method is allowed to store, which is
    // what the annotation was for: `cancelled` and `pending` cannot reach it.
    status: Extract<ApprovalStatus, 'approved' | 'rejected'>,
    dto: DecideApprovalDto,
  ): Promise<ApprovalResponseDto> {
    const existing = await this.getReachable(actor, id);

    this.assertMayDecide(actor, existing);
    this.assertPending(existing);

    const comment = dto.comment?.trim() ?? null;

    let decided: SelectedApproval;

    try {
      decided = await this.prisma.approvalRequest.update({
        // `status: pending` is in the filter as well as checked above, and it is the copy that
        // matters: the check tells the caller *why* in a readable 409, and the filter is what actually
        // stops a second reviewer from overwriting a decision made a moment ago. Prisma's extended
        // unique filter allows the extra condition beside the id.
        where: { id: existing.id, status: ApprovalStatus.pending },
        // All four fields together. A row with a terminal status and no reviewer, or a reviewer and no
        // timestamp, is not a state this table should be able to hold.
        data: {
          status,
          reviewedById: actor.id,
          reviewedAt: new Date(),
          comment,
        },
        select: APPROVAL_SELECT,
      });
    } catch (error) {
      // The row was here a moment ago — `getReachable` read it — so a missing record now means
      // somebody else decided it in between, which is a conflict rather than a 404.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw alreadyDecided();
      }

      throw this.translate(error);
    }

    // Required by the brief, and the reason the trail carries `APPROVAL_APPROVED` and
    // `APPROVAL_REJECTED` at all: the row itself says who decided, but only the trail says it in a
    // place that is append-only and read beside every other administrative act.
    await this.audit.record({
      // The request's mosque, not the caller's. A platform administrator deciding for another mosque
      // produces an entry that belongs in that mosque's trail, where its own administrators can see it.
      mosqueId: decided.mosqueId,
      action: status === ApprovalStatus.approved ? 'APPROVAL_APPROVED' : 'APPROVAL_REJECTED',
      resource: 'approval',
      resourceId: decided.id,
      actorId: actor.id,
      actorName: actor.email,
      actorRole: actor.role,
      changes: {
        status: { from: ApprovalStatus.pending, to: status },
        entity: decided.entity,
        entityId: decided.entityId,
        action: decided.action,
        requestedById: decided.requestedBy.id,
      },
      // The reviewer's note is duplicated into the trail on purpose. `note` is documented as the place
      // for why a request was refused, and a trail that needs a join to another table to explain itself
      // is one that stops explaining itself the day that table changes.
      note: comment,
    });

    return ApprovalResponseDto.from(decided);
  }

  /**
   * Which rows the caller can see at all.
   *
   * A holder of `platform.manage` is unscoped; everyone else is confined to the mosque in their token.
   * The scope goes into the `where` clause rather than being checked after the read, so another
   * mosque's request is not found rather than found and refused.
   */
  private mosqueScope(actor: AuthenticatedUser): { mosqueId?: string } {
    return hasPermission(effectivePermissions(actor), 'platform.manage')
      ? {}
      : { mosqueId: actor.mosqueId };
  }

  private buildWhere(
    actor: AuthenticatedUser,
    query: ApprovalQueryDto,
  ): Prisma.ApprovalRequestWhereInput {
    const entityId = query.entityId?.trim();

    return {
      // First and non-negotiable. Everything below narrows within it.
      ...this.mosqueScope(actor),
      ...(query.status ? { status: query.status } : {}),
      ...(query.entity ? { entity: query.entity } : {}),
      ...(entityId ? { entityId } : {}),
      // `createdAt` is a timestamp, so an inclusive `to` is "before the start of the next day" rather
      // than "at or before midnight", which would drop everything raised during the final day.
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: toDateOnly(query.from) } : {}),
              ...(query.to ? { lt: dayAfter(query.to) } : {}),
            },
          }
        : {}),
    };
  }

  /** Reads one request the caller is allowed to see, or refuses with 404. */
  private async getReachable(actor: AuthenticatedUser, id: string): Promise<SelectedApproval> {
    const approval = await this.prisma.approvalRequest.findFirst({
      where: { id, ...this.mosqueScope(actor) },
      select: APPROVAL_SELECT,
    });

    if (!approval) throw approvalNotFound();

    return approval;
  }

  /**
   * The self-approval rule.
   *
   * A requester may not decide their own request unless they hold `workflow.selfApprove`, which in the
   * shipped role map is `super_admin` alone. Expressed as a permission rather than as a role check so
   * that a mosque which genuinely needs one person to do both can grant it to that person, and so that
   * the exemption is visible in the same place as every other authority.
   *
   * 403 rather than 404 here, unlike an unreachable row: the caller demonstrably knows this request
   * exists, because they raised it. There is nothing left to conceal, and a 404 would be a lie that
   * sends them looking for a bug.
   */
  private assertMayDecide(actor: AuthenticatedUser, approval: SelectedApproval): void {
    if (approval.requestedBy.id !== actor.id) return;
    if (hasPermission(effectivePermissions(actor), 'workflow.selfApprove')) return;

    throw new ForbiddenException({
      code: 'SELF_APPROVAL_DENIED',
      message: 'You raised this request, so somebody else has to decide it.',
    });
  }

  /**
   * A decision happens once.
   *
   * There is no route back to `pending` and no way to revise a decision, because a decision is a record
   * of what somebody decided and re-opening it would erase that. A second look means a second request,
   * which is why nothing forbids two rows over the same target once the first has been settled.
   */
  private assertPending(approval: SelectedApproval): void {
    if (approval.status === ApprovalStatus.pending) return;

    throw alreadyDecided(approval.status);
  }

  /**
   * Refuses a second pending request over the same target.
   *
   * Scoped to the mosque as well as the target, so two mosques that happen to use the same `entityId`
   * do not block each other — the reference is unenforced, so nothing guarantees they will not.
   *
   * This is a check rather than a constraint because the constraint would have to be partial
   * (`WHERE status = 'pending'`), Prisma cannot express that, and a hand-written index would drift the
   * database from the schema permanently. The gap that leaves is two simultaneous requests both
   * passing: the result is a duplicate row in a review queue, which a reviewer resolves in a second.
   * The alternative was a migration state that invites `migrate dev` to reset the database.
   */
  private async assertNothingPending(mosqueId: string, dto: CreateApprovalDto): Promise<void> {
    const outstanding = await this.prisma.approvalRequest.findFirst({
      where: {
        mosqueId,
        entity: dto.entity,
        entityId: dto.entityId.trim(),
        action: dto.action,
        status: ApprovalStatus.pending,
      },
      // Only the id: this is an existence check, and reading the row would be reading data to throw away.
      select: { id: true },
    });

    if (!outstanding) return;

    throw new ConflictException({
      code: 'APPROVAL_ALREADY_PENDING',
      message: `A request to ${dto.action} this ${dto.entity} is already awaiting a decision.`,
    });
  }

  /**
   * `to >= from`, when both were given.
   *
   * An inverted window is a 400 rather than an empty page, because it is a mistake in the request and
   * answering "no results" hides it. ISO `YYYY-MM-DD` strings compare correctly as strings, so this
   * needs no parsing and cannot pick up a timezone on the way.
   */
  private assertRange(from: string | undefined, to: string | undefined): void {
    if (!from || !to || to >= from) return;

    throw new BadRequestException({
      code: 'INVALID_DATE_RANGE',
      message: 'to must not fall before from.',
    });
  }

  /**
   * Turns a Prisma failure into an HTTP one.
   *
   * Anything unrecognised is returned unchanged so the global filter logs it and answers 500 — a
   * database fault is not the caller's to interpret, and inventing a 4xx for one would hide a bug.
   */
  private translate(error: unknown): unknown {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return error;

    switch (error.code) {
      // A requester or reviewer that does not resolve, or a mosque that does not. Not the caller's
      // doing in any normal request — both ids come from a token this server signed.
      case 'P2003':
        return new BadRequestException({
          code: 'APPROVAL_REFERENCE_INVALID',
          message: 'That request references a mosque or a person that no longer exists.',
        });
      case 'P2025':
        return approvalNotFound();
      default:
        return error;
    }
  }
}

function approvalNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'APPROVAL_NOT_FOUND',
    message: 'We could not find that approval request.',
  });
}

function alreadyDecided(status?: ApprovalStatus): ConflictException {
  return new ConflictException({
    code: 'APPROVAL_ALREADY_DECIDED',
    message: status
      ? `That request was already ${status}. Raise a new one for a second look.`
      : 'That request was decided by somebody else a moment ago.',
  });
}
