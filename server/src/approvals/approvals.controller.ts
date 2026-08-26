import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { ApprovalsService } from './approvals.service';
import { ApprovalQueryDto } from './dto/approval-query.dto';
import { ApprovalEnvelopeDto, ApprovalListEnvelopeDto } from './dto/approval-response.dto';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { DecideApprovalDto } from './dto/decide-approval.dto';

/**
 * Approvals: something is proposed, and somebody with the authority accepts or declines it.
 *
 * Every route lives under `/api/v1/approvals` — the global prefix and URI versioning are set in
 * `bootstrap.ts`, so neither appears here.
 *
 * **Two grants, and they are already in the registry.** `workflow.review` gets a caller into the queue
 * and lets them raise a request; `workflow.approve` lets them decide one. The split is not invented
 * here — the shipped role map already draws it, and draws it exactly this way: a `treasurer` holds
 * `workflow.review` and not `workflow.approve` under the comment "a treasurer prepares a payment and
 * someone else signs it off", and a `secretary` the same. `mosque_admin` holds both. So the person who
 * prepares can raise a request and watch it, and the person who signs off is somebody else, without a
 * single new permission being added or a role name being compared anywhere.
 *
 * **A requester cannot decide their own request.** That is enforced in the service, as a refusal unless
 * the caller holds `workflow.selfApprove` — a grant that already exists and is already `PLATFORM_ONLY`,
 * so `super_admin` alone has it. `mosque_admin` deliberately does not: the person who runs the mosque
 * can decide other people's requests and not their own, which is what a second pair of eyes means.
 *
 * **Nothing here executes anything.** An approved request records that an operation was permitted; the
 * module that owns the target still performs it, under its own permissions. There is no route that pays
 * a salary or books an expense as a side effect of a decision, and there should not be.
 *
 * **There is no update, no delete, and no cancel route.** A decision moves the status once and there is
 * no way back: re-opening a decided request would erase the record of what somebody decided, and a
 * second look is a second request. `cancelled` exists on the enum because the brief specifies the state,
 * but no endpoint sets it, which is also why the audit vocabulary has no `APPROVAL_CANCELLED` — an
 * action nothing can write is dead vocabulary.
 *
 * The mosque is never read from the request. Each method hands the authenticated user to the service,
 * which takes the scope from the token.
 */
@ApiTags('Approvals')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
// Declared once on the class so a route added later inherits the requirement instead of being born
// open. The two decision routes override it below with the narrower grant.
@Permissions('workflow.review')
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Post()
  @ApiOperation({
    summary: 'Raise a request for review.',
    description:
      'Requires `workflow.review` — the grant a treasurer or secretary holds, being the people who ' +
      'prepare something and need it signed off. The request belongs to the caller’s mosque and is ' +
      'attributed to the caller, both from the access token; a `mosqueId`, `requestedById` or ' +
      '`status` in the body is rejected. `entity` and `action` are closed lists. `entityId` names the ' +
      'row under review and is **not resolved or joined to** — this table holds a reference, and a ' +
      'reviewer opens the target through the module that owns it, where that module’s permissions ' +
      'apply. Status starts `pending`. A second pending request over the same entity, id and action ' +
      'is a 409: two rows asking the same question is how one invoice gets approved twice.',
  })
  @ApiCreatedResponse({ description: 'The request was raised.', type: ApprovalEnvelopeDto })
  @ApiBadRequestResponse({
    description:
      'A field failed validation: an unknown property, an `entity` or `action` outside the closed ' +
      'list, or an `entityId` longer than 64 characters.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `workflow.review`.' })
  @ApiConflictResponse({
    description: 'A request over the same target is already awaiting a decision.',
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateApprovalDto,
  ): Promise<ApprovalEnvelopeDto> {
    return {
      success: true,
      message: 'Approval request created successfully',
      data: await this.approvals.create(user, dto),
    };
  }

  @Get()
  @ApiOperation({
    summary: 'List approval requests.',
    description:
      'Requires `workflow.review`. Paginated and capped at 100 rows per page. **Pending first, then ' +
      'newest first** — the outstanding work is at the top without asking for it. Scoped to the ' +
      'caller’s mosque: another mosque’s requests are not in the result set at all, the one exception ' +
      'being a holder of `platform.manage`, who administers across mosques. `entity` with `entityId` ' +
      'and `status=pending` answers "is anything outstanding against this row?", which is what a ' +
      'module asks before letting an operation through. `from` and `to` filter on when a request was ' +
      'raised, not when it was decided.',
  })
  @ApiOkResponse({ description: 'A page of requests.', type: ApprovalListEnvelopeDto })
  @ApiBadRequestResponse({
    description:
      'A query parameter failed validation, including a `limit` above 100, a malformed date, or a ' +
      '`to` that falls before `from`.',
  })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `workflow.review`.' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ApprovalQueryDto,
  ): Promise<ApprovalListEnvelopeDto> {
    const { rows, meta } = await this.approvals.findMany(user, query);

    return {
      success: true,
      message: 'Approval requests retrieved successfully',
      data: rows,
      meta,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Read one approval request.',
    description:
      'Requires `workflow.review`. A request belonging to another mosque answers 404 rather than ' +
      '403 — a 403 would confirm the record exists. The target row is not expanded: `entity` and ' +
      '`entityId` come back as stored.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The request.', type: ApprovalEnvelopeDto })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `workflow.review`.' })
  @ApiNotFoundResponse({ description: 'No such approval request in this mosque.' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApprovalEnvelopeDto> {
    return {
      success: true,
      message: 'Approval request retrieved successfully',
      data: await this.approvals.findOne(user, id),
    };
  }

  @Post(':id/approve')
  @Permissions('workflow.approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve a request.',
    description:
      'Requires `workflow.approve` — not `workflow.review`, which is the preparer’s grant. **The ' +
      'requester cannot approve their own request** unless they hold `workflow.selfApprove`, which ' +
      'only `super_admin` does; anyone else attempting it gets a 403, including a `mosque_admin`. ' +
      'Only a `pending` request can be approved: one already decided is a 409, and so is losing the ' +
      'race to another reviewer, because the update is filtered on the pending state as well as ' +
      'checked. `status`, `reviewedBy`, `reviewedAt` and `comment` are written together. `comment` is ' +
      'the only field the body may carry, and an empty body is a complete approval. **Approving does ' +
      'not perform the operation** — it records that it was permitted, and the module that owns the ' +
      'target still carries it out under its own permissions. Every approval writes an audit entry.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The approved request.', type: ApprovalEnvelopeDto })
  @ApiBadRequestResponse({
    description: 'The body carried an unknown property or an overlong comment.',
  })
  @ApiForbiddenResponse({
    description:
      'Authenticated, but without `workflow.approve`; or the caller raised this request and does not ' +
      'hold `workflow.selfApprove`.',
  })
  @ApiNotFoundResponse({ description: 'No such approval request in this mosque.' })
  @ApiConflictResponse({ description: 'That request was already decided.' })
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideApprovalDto,
  ): Promise<ApprovalEnvelopeDto> {
    return {
      success: true,
      message: 'Approval request approved successfully',
      data: await this.approvals.approve(user, id, dto),
    };
  }

  @Post(':id/reject')
  @Permissions('workflow.approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject a request.',
    description:
      'Requires `workflow.approve`. Declining is the same authority as accepting — a reviewer who can ' +
      'only say yes is not a reviewer. Every rule that applies to approving applies here: the ' +
      'requester cannot reject their own request either, only a `pending` request can be rejected, ' +
      'and the decision is one atomic update. `comment` is strongly encouraged, since it is the only ' +
      'record of why, but it is not required: a mandatory field with nothing to say gets filled with ' +
      'a character, and then the column means less than an empty one would. Every rejection writes an ' +
      'audit entry.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The rejected request.', type: ApprovalEnvelopeDto })
  @ApiBadRequestResponse({
    description: 'The body carried an unknown property or an overlong comment.',
  })
  @ApiForbiddenResponse({
    description:
      'Authenticated, but without `workflow.approve`; or the caller raised this request and does not ' +
      'hold `workflow.selfApprove`.',
  })
  @ApiNotFoundResponse({ description: 'No such approval request in this mosque.' })
  @ApiConflictResponse({ description: 'That request was already decided.' })
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideApprovalDto,
  ): Promise<ApprovalEnvelopeDto> {
    return {
      success: true,
      message: 'Approval request rejected successfully',
      data: await this.approvals.reject(user, id, dto),
    };
  }
}
