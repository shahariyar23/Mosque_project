import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Role } from '@prisma/client';
import * as argon2 from 'argon2';

import { AuditLogService } from '../audit/audit-log.service';
import { definedChanges, type AuditEntry } from '../audit/types/audit-log.types';
import type { Permission } from '../common/constants/permissions';
import { effectivePermissions, hasPermission, scopeFor } from '../common/constants/roles';
import { forbidden } from '../common/guards/authorization';
import { MAX_PAGE_SIZE } from '../common/pagination/page';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { isPlatformRole } from '../roles/types/role.types';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto';
import { UpdateUserPositionsDto } from './dto/update-user-positions.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { DeletedUserDto, UserListMetaDto, UserResponseDto } from './dto/user-response.dto';
import {
  DEFAULT_USER_PAGE_SIZE,
  USER_SELECT,
  isActiveFor,
  type SelectedUser,
} from './types/user.types';

/**
 * Everything the users endpoints do.
 *
 * Seven rules run through the whole file.
 *
 * A password only ever exists here as an argon2id hash. `USER_SELECT` never reads the column back, so
 * no method in this service is in a position to leak it even by accident.
 *
 * A user is never hard-deleted. Their name is on donations they recorded and on audit rows, and those
 * references have to keep resolving — the schema says so at the `deletedAt` column. `remove()`
 * therefore stamps `deletedAt`, and every read filters on `deletedAt: null`.
 *
 * Prisma errors are translated, never passed through. Prisma's own messages name tables, columns and
 * constraints, which is internal shape a client should not learn.
 *
 * Nobody hands out authority they do not hold. The guards decide whether a caller may touch these
 * endpoints at all; `setRole` and `setPermissions` decide how far a caller who may is allowed to
 * reach, which is a question about the actor and the target together and so cannot live in a guard.
 * `update` answers the same shape of question for ownership — whether the record being edited is the
 * caller's own — which a permission cannot express either.
 *
 * Nobody reaches another mosque. Every read and every write resolves the target through `mosqueScope`,
 * which pins the query to the mosque on the caller's token and never to anything in the request. The one
 * exception is a holder of `platform.manage`, who administers the platform itself. A target outside the
 * caller's mosque answers 404 rather than 403, matching every other module here: a 403 would confirm the
 * account exists, which for a directory of members is the disclosure worth avoiding.
 *
 * The platform never runs out of super admins. `setRole`, `setStatus` and `remove` each refuse the change
 * that would take the last active one away — a demotion, a suspension and a deletion are three different
 * requests with the same consequence, so the guard sits in all three rather than in one of them.
 *
 * Every change to who someone is or what they may do is recorded. `AuditLogService` is best-effort by
 * design and called after the write commits, so the trail can never turn a legitimate administrative
 * action into a failure. What goes into an entry is named field by field; no password, hash or token is
 * ever among the names, and `redactSecrets` removes one anyway if a later edit adds it by mistake.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  /**
   * Creates a user.
   *
   * The actor is optional because two very different callers arrive here. An administrator holding
   * `user.manage` creates an account for somebody else, and their token decides which mosque it may
   * belong to. `AuthService.register` creates an account for the person asking, has no token to offer,
   * and has already resolved the mosque from a slug on the server — so there is nothing there for a
   * caller to substitute either.
   */
  async create(dto: CreateUserDto, actor?: AuthenticatedUser): Promise<UserResponseDto> {
    this.assertMayReachMosque(dto.mosqueId, actor);
    await this.assertMosqueExists(dto.mosqueId);
    await this.assertContactIsFree(dto.mosqueId, { email: dto.email, phone: dto.phone });

    // Argon2id: memory-hard, so a stolen hash cannot be attacked with a GPU the way a fast digest can.
    // The plaintext is not logged, not stored and goes out of scope with this method.
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    let created: SelectedUser;

    try {
      created = await this.prisma.user.create({
        // Written field by field rather than spread from the DTO: a field added to the DTO later
        // cannot reach the database until someone names it here.
        data: {
          mosqueId: dto.mosqueId,
          fullName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          // `role`, `positions` and `permissions` are omitted on purpose and land on their schema
          // defaults — a new account is a `member` until someone with `role.assign` says otherwise.
          isActive: dto.status ? isActiveFor(dto.status) : true,
          dateOfBirth: toDateColumn(dto.dateOfBirth),
          gender: dto.gender,
          city: dto.city,
          avatarUrl: dto.avatarUrl,
          newsletter: dto.newsletter,
        },
        select: USER_SELECT,
      });
    } catch (error) {
      // The pre-check above gives a field-specific message; this catches the race between the two
      // statements, where two requests for the same address arrive at once.
      throw this.translate(error);
    }

    // `dto.password` is deliberately not among these names, and never will be.
    await this.audit.record({
      // A self-registration has no actor but still has a subject, and recording the new account as its
      // own actor is truer than recording none: somebody did do this, and it was them.
      ...(actor
        ? this.actorOf(actor)
        : { actorId: created.id, actorName: created.email, actorRole: created.role }),
      mosqueId: created.mosqueId,
      action: 'USER_CREATED',
      resource: 'user',
      resourceId: created.id,
      changes: {
        fullName: created.fullName,
        email: created.email,
        phone: created.phone,
        isActive: created.isActive,
      },
      ...(actor ? {} : { note: 'Self-registration.' }),
    });

    return UserResponseDto.from(created);
  }

  async findMany(
    query: UserQueryDto,
    actor: AuthenticatedUser,
  ): Promise<{ rows: UserResponseDto[]; meta: UserListMetaDto }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? DEFAULT_USER_PAGE_SIZE), MAX_PAGE_SIZE);
    const where = this.buildWhere(query, actor);

    // One transaction so the count and the page describe the same set of rows. Counting separately
    // means a concurrent insert can produce a total that does not match the rows returned.
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        // `id` breaks ties so a row cannot appear on two pages, or on none, when several users share
        // a creation timestamp — which seeding and bulk import both produce.
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      rows: rows.map((row) => UserResponseDto.from(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, actor: AuthenticatedUser): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null, ...this.mosqueScope(actor) },
      select: USER_SELECT,
    });

    if (!user) throw notFound();

    return UserResponseDto.from(user);
  }

  /**
   * Updates profile fields.
   *
   * Two kinds of caller reach this method, and the route admits both on purpose: someone holding
   * `user.manage`, who administers the directory and may edit anyone in it, and someone holding only the
   * base `profile.manageOwn`, who may edit themselves and nobody else. `scopeFor` says which, and the
   * ownership comparison happens here rather than in the guard because that is the codebase's rule —
   * a permission answers "may this kind of person do this at all", never "does this record belong to
   * them", and the second is settled where the query is built.
   *
   * What a self-edit cannot reach is settled by the DTO rather than by a check: `UpdateUserDto` omits
   * `role`, `status`, `password` and `mosqueId`, and the global pipe runs with `forbidNonWhitelisted`,
   * so a member who sends `{"role": "super_admin"}` here gets a 400 for an unrecognised field. There is
   * no branch below that could forget to strip it.
   */
  async update(id: string, dto: UpdateUserDto, actor: AuthenticatedUser): Promise<UserResponseDto> {
    this.assertMayEditProfile(id, actor);

    const existing = await this.load(id, actor);

    // Only checked when the address actually changes, so re-submitting an unchanged form is not a
    // conflict with the user's own row.
    const emailChanged = dto.email !== undefined && dto.email !== existing.email;
    await this.assertContactIsFree(
      existing.mosqueId,
      { email: emailChanged ? dto.email : undefined, phone: dto.phone },
      id,
    );

    let updated: SelectedUser;

    try {
      updated = await this.prisma.user.update({
        where: { id },
        data: {
          fullName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          dateOfBirth: toDateColumn(dto.dateOfBirth),
          gender: dto.gender,
          city: dto.city,
          avatarUrl: dto.avatarUrl,
          newsletter: dto.newsletter,
          // A new address has not been proved yet, so the old verification cannot carry over — that
          // is the whole point of verifying one.
          ...(emailChanged ? { emailVerifiedAt: null } : {}),
        },
        select: USER_SELECT,
      });
    } catch (error) {
      throw this.translate(error);
    }

    // Only what was actually sent. An absent field is not a change, and recording it as one would make
    // every entry look like a rewrite of the whole profile.
    await this.audit.record({
      ...this.actorOf(actor),
      mosqueId: existing.mosqueId,
      action: 'USER_UPDATED',
      resource: 'user',
      resourceId: id,
      changes: definedChanges({
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        dateOfBirth: dto.dateOfBirth,
        gender: dto.gender,
        city: dto.city,
        avatarUrl: dto.avatarUrl,
        newsletter: dto.newsletter,
        ...(emailChanged ? { emailVerifiedAt: null } : {}),
      }),
      ...(id === actor.id ? { note: 'Self-service profile edit.' } : {}),
    });

    return UserResponseDto.from(updated);
  }

  /**
   * Activates or suspends an account.
   *
   * Its own method, and its own endpoint, because this is an access decision rather than an edit:
   * `effectivePermissions` resolves an inactive account to nothing at all, base permissions included,
   * so flipping this column is a complete revocation. Existing refresh tokens are left alone
   * deliberately — a session belonging to a suspended account already resolves no permissions, and
   * reactivating should not force everyone to sign in again.
   *
   * Being a complete revocation is also why the last-super-admin guard applies here and not only to
   * `setRole`. Suspending the last super admin leaves an account that still *says* `super_admin` and can
   * do nothing, which is the same outcome as demoting them and harder to notice.
   */
  async setStatus(
    id: string,
    dto: UpdateUserStatusDto,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const target = await this.load(id, actor);
    const isActive = isActiveFor(dto.status);

    if (!isActive) await this.assertNotLastSuperAdmin(target);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: USER_SELECT,
    });

    await this.audit.record({
      ...this.actorOf(actor),
      mosqueId: target.mosqueId,
      action: 'USER_STATUS_CHANGED',
      resource: 'user',
      resourceId: id,
      changes: { isActive: { from: target.isActive, to: isActive } },
    });

    return UserResponseDto.from(updated);
  }

  /**
   * Assigns a role.
   *
   * The guard on the route has already established that the caller holds `role.assign`. That is not
   * the end of the question, because `role.assign` is held by `mosque_admin` as well as `super_admin`,
   * and a permission alone cannot express "you may hand out any role below your own". Two rules close
   * that gap:
   *
   * A role carrying platform authority may only be granted or taken away by someone who holds
   * `platform.manage`. Without that, a mosque admin could mint a super admin — or, just as bad, demote
   * the platform owner — while holding no platform authority themselves.
   *
   * Nobody changes their own role. Not primarily a hardening rule: it stops the last super admin
   * locking the platform's owner out of it with one request, and it removes any path where the actor
   * and the target are the same row and the checks above compare a subject to itself.
   *
   * And the platform keeps at least one active super admin. That is a different rule from the one above
   * — it catches two administrators demoting each other, which no self-edit ban can see.
   *
   * `dto.role` has already been validated against the Prisma enum, so a request carrying
   * `"SUPER_ADMIN"` or `"president"` was rejected as malformed before reaching this method. What the
   * body *claims* about the caller's own role is never read here at all — the actor comes from the
   * verified token via `JwtStrategy`, which loads role and permissions from the database on every
   * request.
   */
  async setRole(
    id: string,
    dto: UpdateUserRoleDto,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const target = await this.loadForAssignment(id, actor);

    if (target.id === actor.id) {
      throw new ForbiddenException({
        code: 'CANNOT_CHANGE_OWN_ROLE',
        message: 'You cannot change your own role. Ask another administrator to do it.',
      });
    }

    if (
      (isPlatformRole(dto.role) || isPlatformRole(target.role)) &&
      !hasPermission(effectivePermissions(actor), 'platform.manage')
    ) {
      this.refuse(actor.id, target.id, `role ${dto.role} needs platform.manage`);
    }

    // Only a change *away* from the role can cost the platform its last holder of it.
    if (dto.role !== 'super_admin') await this.assertNotLastSuperAdmin(target);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: USER_SELECT,
    });

    await this.audit.record({
      ...this.actorOf(actor),
      mosqueId: target.mosqueId,
      action: 'ROLE_ASSIGNED',
      resource: 'user',
      resourceId: id,
      changes: { role: { from: target.role, to: dto.role } },
    });

    return UserResponseDto.from(updated);
  }

  /**
   * Sets the individual grants and denials layered on top of a role.
   *
   * Each array replaces the column it names; an omitted array is left as it is. Every element was
   * checked against the compile-time registry by the DTO, so nothing unrecognised can be stored.
   *
   * The rule that matters is what the caller may add. Two edits increase what the target can do:
   * granting a permission, and lifting a denial — the second is easy to miss, because it looks like a
   * removal, but a user whose `finance.manage` denial is dropped walks away with `finance.manage`.
   * Both are refused unless the caller holds the permission concerned. So a treasurer may pass on the
   * finance permissions they have and nothing else, and — the case this really exists for — a mosque
   * admin cannot grant themselves or anyone else `platform.manage`, which is not in their own set.
   *
   * Imposing a denial is unrestricted. It only ever reduces what the target can do, so it cannot be a
   * route to authority the caller lacks. As with roles, a target holding a platform role is off limits
   * to callers without platform authority.
   */
  async setPermissions(
    id: string,
    dto: UpdateUserPermissionsDto,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    if (dto.permissions === undefined && dto.deniedPermissions === undefined) {
      throw new BadRequestException({
        code: 'NOTHING_TO_UPDATE',
        message: 'Send permissions, deniedPermissions, or both.',
      });
    }

    const target = await this.loadForAssignment(id, actor);
    const granted = effectivePermissions(actor);
    const isPlatformActor = hasPermission(granted, 'platform.manage');

    if (isPlatformRole(target.role) && !isPlatformActor) {
      this.refuse(actor.id, target.id, 'target holds a platform role');
    }

    const added = missingFrom(dto.permissions ?? target.permissions, target.permissions);
    const lifted = missingFrom(
      target.deniedPermissions,
      dto.deniedPermissions ?? target.deniedPermissions,
    );
    const beyondActor = [...added, ...lifted].filter(
      (permission) => !granted.includes(permission as Permission),
    );

    if (beyondActor.length > 0) {
      // The response says only that the request was refused. Answering "you are missing
      // finance.manage and report.export" would let a curious member map the whole permission model
      // one rejected request at a time.
      this.refuse(actor.id, target.id, `does not hold ${beyondActor.join(', ')}`);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.permissions !== undefined ? { permissions: dto.permissions } : {}),
        ...(dto.deniedPermissions !== undefined
          ? { deniedPermissions: dto.deniedPermissions }
          : {}),
      },
      select: USER_SELECT,
    });

    // `added` and `lifted` are recorded alongside the new arrays because they are the part a reviewer
    // actually wants: the two lists say what the target now has, these two say what changed.
    await this.audit.record({
      ...this.actorOf(actor),
      mosqueId: target.mosqueId,
      action: 'PERMISSION_CHANGED',
      resource: 'user',
      resourceId: id,
      changes: definedChanges({
        permissions: dto.permissions,
        deniedPermissions: dto.deniedPermissions,
        added,
        lifted,
      }),
    });

    return UserResponseDto.from(updated);
  }

  /**
   * Sets the committee posts a person holds.
   *
   * The guard has established `position.assign`, and unlike `setRole` and `setPermissions` there is
   * nothing further to establish. Those two carry extra rules because the columns they write are read by
   * the permission resolver, so a careless write hands out authority. `positions` is read by nothing that
   * decides anything — the schema says so at the enum. So there is deliberately no platform-role rule and
   * no ban on assigning yourself a post here: both would be ceremony over a display column, and
   * `position.assign` is held only by the roles that already administer the directory.
   *
   * It is still an audited action rather than a profile edit, which is why it has its own route and its
   * own permission: the public leadership list is generated from this column, so writing it is a claim
   * about who runs the mosque even though it grants nothing.
   */
  async setPositions(
    id: string,
    dto: UpdateUserPositionsDto,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const target = await this.load(id, actor);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { positions: dto.positions },
      select: USER_SELECT,
    });

    await this.audit.record({
      ...this.actorOf(actor),
      mosqueId: target.mosqueId,
      action: 'POSITIONS_ASSIGNED',
      resource: 'user',
      resourceId: id,
      changes: { positions: dto.positions },
    });

    return UserResponseDto.from(updated);
  }

  /**
   * Soft-deletes a user.
   *
   * A hard delete is not offered at all, and not because it would fail — it would succeed. `AuditLog.actorId`
   * is `onDelete: SetNull`, so deleting a treasurer would quietly detach them from every financial
   * action they took, and `RefreshToken` would cascade. Losing the actor on an audit row defeats the
   * purpose of having one, so the row stays and is marked instead.
   *
   * The account is deactivated in the same breath, which revokes its permissions, and its live
   * sessions are revoked so a token issued minutes ago cannot outlive the account.
   */
  async remove(id: string, actor: AuthenticatedUser): Promise<DeletedUserDto> {
    const target = await this.load(id, actor);

    await this.assertNotLastSuperAdmin(target);

    const deletedAt = new Date();

    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { deletedAt, isActive: false },
        select: { id: true, deletedAt: true },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: deletedAt },
      }),
    ]);

    await this.audit.record({
      ...this.actorOf(actor),
      mosqueId: target.mosqueId,
      action: 'USER_DELETED',
      resource: 'user',
      resourceId: id,
      changes: { deletedAt: deletedAt.toISOString(), isActive: false },
      note: 'Soft delete; account deactivated and live sessions revoked.',
    });

    return { id: user.id, deletedAt: (user.deletedAt ?? deletedAt).toISOString() };
  }

  // ---- internals ------------------------------------------------------------

  /**
   * Refuses a profile edit aimed at someone else by a caller who may only edit themselves.
   *
   * `scopeFor` is the existing resolver for a view/viewOwn pair and returns the same three answers here:
   * `all` for a directory administrator, `own` for everybody else with an active account — because
   * `profile.manageOwn` is a base permission — and `none` for a suspended one, since
   * `effectivePermissions` resolves an inactive account to nothing at all, base permissions included.
   *
   * The refusal says only that it was refused, like every other refusal in this service. "You may only
   * edit your own profile" would be harmless here, but a caller learning which of their requests were
   * refused for *which* reason is how a permission model gets mapped, and the reason is in the log.
   */
  private assertMayEditProfile(targetId: string, actor: AuthenticatedUser): void {
    const scope = scopeFor(effectivePermissions(actor), 'user.manage', 'profile.manageOwn');

    if (scope === 'all') return;
    if (scope === 'own' && targetId === actor.id) return;

    this.logger.debug(`profile edit refused: ${actor.id} -> ${targetId} (scope: ${scope})`);

    throw forbidden();
  }

  /**
   * The mosque filter every read and write goes through, or nothing at all for a platform
   * administrator.
   *
   * Read from `effectivePermissions` rather than from the role name, so it answers the same question the
   * guard does. Two consequences worth stating: a deactivated account resolves to no permissions and so
   * is confined rather than unleashed, and a `platform.manage` denial layered onto an individual account
   * confines that account too, without anybody having to remember this method exists.
   *
   * The mosque comes from the token. There is no parameter, anywhere in this service, through which a
   * caller could offer a different one.
   */
  private mosqueScope(actor: AuthenticatedUser): { mosqueId?: string } {
    return hasPermission(effectivePermissions(actor), 'platform.manage')
      ? {}
      : { mosqueId: actor.mosqueId };
  }

  /**
   * Refuses a create aimed at a mosque the caller does not administer.
   *
   * A 403 here, where every read gives a 404, and the difference is deliberate: a 404 hides whether a
   * *record* exists, which is the thing worth hiding. The mosque id in a create came from the caller and
   * `GET /mosques` lists them all, so there is nothing left to conceal — and answering "no such mosque"
   * about one the caller can see listed would be a lie that costs an administrator an afternoon.
   *
   * No actor means `AuthService.register`, which resolved the mosque from a slug on the server. There is
   * no client-supplied id on that path for this method to check.
   */
  private assertMayReachMosque(mosqueId: string, actor: AuthenticatedUser | undefined): void {
    if (!actor) return;
    if (this.mosqueScope(actor).mosqueId === undefined) return;
    if (mosqueId === actor.mosqueId) return;

    this.logger.debug(`cross-mosque create refused: ${actor.id} -> mosque ${mosqueId}`);

    throw new ForbiddenException({
      code: 'CROSS_MOSQUE_DENIED',
      message: 'You can only manage users at your own mosque.',
    });
  }

  /**
   * Refuses a change that would leave the platform with no active super admin.
   *
   * Counted platform-wide, not within the caller's mosque: `super_admin` is a platform role, so the last
   * one anywhere is the last one. Counted at the moment of the change rather than cached, because two
   * administrators demoting each other is exactly the race this exists to lose safely.
   *
   * A target who is not an active super admin cannot be the last one, so those calls cost nothing and
   * return before the query. And a 409 rather than a 403: the caller has the authority, the platform just
   * cannot be left in that state, and the message says which so they can fix it.
   */
  private async assertNotLastSuperAdmin(target: {
    id: string;
    role: Role;
    isActive: boolean;
  }): Promise<void> {
    if (target.role !== 'super_admin' || !target.isActive) return;

    const others = await this.prisma.user.count({
      where: { role: 'super_admin', isActive: true, deletedAt: null, id: { not: target.id } },
    });

    if (others > 0) return;

    throw new ConflictException({
      code: 'LAST_SUPER_ADMIN',
      message:
        'This is the last active super admin. Appoint another one before changing this account.',
    });
  }

  /**
   * The actor half of an audit entry.
   *
   * `AuthenticatedUser` carries no display name, so the email is what identifies the caller. That is a
   * deliberate limit rather than an omission: a name is a mutable profile field, and putting one in a
   * signed token would mean the trail recorded whatever it said when the token was issued.
   */
  private actorOf(
    actor: AuthenticatedUser,
  ): Pick<AuditEntry, 'actorId' | 'actorName' | 'actorRole'> {
    return { actorId: actor.id, actorName: actor.email, actorRole: actor.role };
  }

  private buildWhere(query: UserQueryDto, actor: AuthenticatedUser): Prisma.UserWhereInput {
    const search = query.search?.trim();

    return {
      // Soft-deleted users are gone as far as every read is concerned.
      deletedAt: null,
      ...this.mosqueScope(actor),
      ...(query.status ? { isActive: isActiveFor(query.status) } : {}),
      // An exact match on an indexed column — `@@index([mosqueId, role])` — not a text comparison.
      ...(query.role ? { role: query.role } : {}),
      // `positions` is a scalar list, so the filter asks whether it contains the post rather than
      // whether it equals it: someone who is both treasurer and cashier must appear under each.
      ...(query.position ? { positions: { has: query.position } } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              // Phone is stored in E.164 with no punctuation, so a substring match is what makes
              // "0170" find "+8801700000002".
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  /**
   * Reads the few columns the write paths need, and refuses if the user is absent, soft-deleted or at
   * another mosque.
   *
   * The three cases answer alike on purpose. Whether a caller is looking at a record that does not exist,
   * one that was deleted, or one belonging to a mosque they have no business in, the only thing they
   * learn is that they cannot have it.
   *
   * `role` and `isActive` are here for `assertNotLastSuperAdmin`, and `mosqueId` for the audit entry —
   * which is the *target's* mosque, so a platform administrator's cross-mosque action is filed where it
   * happened rather than where they happen to be.
   */
  private async load(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<Pick<SelectedUser, 'id' | 'mosqueId' | 'email' | 'role' | 'isActive'>> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null, ...this.mosqueScope(actor) },
      select: { id: true, mosqueId: true, email: true, role: true, isActive: true },
    });

    if (!user) throw notFound();

    return user;
  }

  /**
   * Reads what an assignment decision needs: the target's current role and its two permission arrays.
   *
   * The current values are the whole point. An assignment can only be judged as a change — "what does
   * this request add that the target did not already have?" — so comparing against the row is what
   * distinguishes granting a permission from leaving one in place.
   */
  private async loadForAssignment(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<
    Pick<
      SelectedUser,
      'id' | 'mosqueId' | 'role' | 'isActive' | 'permissions' | 'deniedPermissions'
    >
  > {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null, ...this.mosqueScope(actor) },
      select: {
        id: true,
        mosqueId: true,
        role: true,
        isActive: true,
        permissions: true,
        deniedPermissions: true,
      },
    });

    if (!user) throw notFound();

    return user;
  }

  /**
   * Refuses an assignment that would hand out authority the caller does not hold.
   *
   * The reason is logged and not returned. Every refusal answers with the same code and the same
   * sentence, so a caller probing for the edge of their own authority learns only that they reached it.
   */
  private refuse(actorId: string, targetId: string, reason: string): never {
    this.logger.debug(`assignment refused: ${actorId} -> ${targetId} (${reason})`);

    throw new ForbiddenException({
      code: 'ESCALATION_REFUSED',
      message: 'You cannot grant authority you do not hold yourself.',
    });
  }

  private async assertMosqueExists(mosqueId: string): Promise<void> {
    const mosque = await this.prisma.mosque.findUnique({
      where: { id: mosqueId },
      select: { id: true },
    });

    if (!mosque) {
      throw new BadRequestException({
        code: 'MOSQUE_NOT_FOUND',
        message: 'The mosque this user would belong to does not exist.',
      });
    }
  }

  /**
   * Refuses an email or phone already in use within the same mosque.
   *
   * Deliberately does *not* exclude soft-deleted rows: they still hold the unique slot, so excluding
   * them here would turn a clear 409 into a database constraint error with a vaguer message. Reusing
   * a deleted person's address needs an explicit restore, which is not part of this module.
   */
  private async assertContactIsFree(
    mosqueId: string,
    contact: { email?: string | null; phone?: string | null },
    exceptUserId?: string,
  ): Promise<void> {
    // Built conditionally: a Prisma filter of `{ email: undefined }` matches every row rather than
    // none, so an absent field must not become an entry in this list.
    const candidates: Prisma.UserWhereInput[] = [];
    if (contact.email) candidates.push({ email: contact.email });
    if (contact.phone) candidates.push({ phone: contact.phone });
    if (candidates.length === 0) return;

    const clashes = await this.prisma.user.findMany({
      where: {
        mosqueId,
        ...(exceptUserId ? { id: { not: exceptUserId } } : {}),
        OR: candidates,
      },
      select: { email: true, phone: true },
      take: 2,
    });

    if (clashes.length === 0) return;

    if (contact.email && clashes.some((clash) => clash.email === contact.email)) {
      throw new ConflictException({
        code: 'EMAIL_TAKEN',
        message: 'An account with this email address already exists for this mosque.',
      });
    }

    throw new ConflictException({
      code: 'PHONE_TAKEN',
      message: 'An account with this phone number already exists for this mosque.',
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
      case 'P2002':
        return uniqueField(error) === 'phone'
          ? new ConflictException({
              code: 'PHONE_TAKEN',
              message: 'An account with this phone number already exists for this mosque.',
            })
          : new ConflictException({
              code: 'EMAIL_TAKEN',
              message: 'An account with this email address already exists for this mosque.',
            });
      case 'P2003':
        return new BadRequestException({
          code: 'MOSQUE_NOT_FOUND',
          message: 'The mosque this user would belong to does not exist.',
        });
      case 'P2025':
        return notFound();
      default:
        return error;
    }
  }
}

function notFound(): NotFoundException {
  return new NotFoundException({
    code: 'USER_NOT_FOUND',
    message: 'We could not find that user.',
  });
}

/** Values in `candidates` that `existing` does not already contain — the change a request represents. */
function missingFrom(candidates: string[], existing: string[]): string[] {
  return candidates.filter((candidate) => !existing.includes(candidate));
}

/**
 * `YYYY-MM-DD` to the instant a `Date` column expects.
 *
 * Pinned to UTC midnight rather than parsed in local time: `new Date('1990-04-17')` is already UTC,
 * but being explicit stops someone "fixing" it into a local-time parse later, which would store the
 * previous day for anyone east of Greenwich.
 *
 * `undefined` means "not mentioned" and `null` means "clear it" — Prisma reads them that way too, so
 * both are passed straight through.
 */
function toDateColumn(value: string | null | undefined): Date | null | undefined {
  if (value === undefined || value === null) return value;
  return new Date(`${value}T00:00:00.000Z`);
}

/** Which unique index a P2002 came from, read out of Prisma's `meta.target`. */
function uniqueField(error: Prisma.PrismaClientKnownRequestError): 'email' | 'phone' | null {
  const target: unknown = error.meta?.target;
  const text = Array.isArray(target)
    ? target.map((part) => String(part)).join(',')
    : typeof target === 'string'
      ? target
      : '';

  if (text.includes('phone')) return 'phone';
  if (text.includes('email')) return 'email';
  return null;
}
