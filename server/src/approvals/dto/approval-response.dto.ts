import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalStatus } from '@prisma/client';

import {
  APPROVAL_ACTIONS,
  APPROVAL_ENTITIES,
  type ApprovalAction,
  type ApprovalEntity,
  type SelectedApproval,
} from '../types/approval.types';

/**
 * Just enough of a person to name them in a queue.
 *
 * Not the user record. Their email, phone, address and role are readable at `/users/:id` by someone
 * holding `user.view`, and holding `workflow.review` is not that entitlement — a reviewer needs to know
 * who asked, not how to contact them.
 */
export class ApprovalPersonRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Ahmed Hasan' })
  fullName!: string;
}

/**
 * A request for review, as the API returns it.
 *
 * `entity` and `entityId` are returned as they were stored, unresolved. Nothing here joins to the target
 * row: the reference tells a reviewer where to look, and they open it through the module that owns it,
 * where that module's own permissions apply. Expanding the target here would mean this route disclosing
 * an expense to anyone holding `workflow.review`, which is not a finance grant.
 *
 * `reviewedBy`, `reviewedAt` and `comment` are all null while the request is `pending` and are all set
 * together when it is decided. A row with a status of `approved` and no reviewer cannot exist.
 *
 * `mosqueId` is kept, unlike most modules' responses, because a holder of `platform.manage` reads this
 * queue across mosques — the same reason `AUDIT_LOG_SELECT` keeps it.
 *
 * `ApprovalPersonRefDto` is declared above this class because it has to be: `emitDecoratorMetadata`
 * writes an eager `design:type` reference for a decorated property typed as a single class, so a
 * forward reference would be read inside its temporal dead zone the moment this module loads.
 */
export class ApprovalResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid', description: 'The mosque the request belongs to.' })
  mosqueId!: string;

  @ApiProperty({ enum: APPROVAL_ENTITIES, example: 'expense' })
  entity!: ApprovalEntity;

  @ApiProperty({
    example: '9f1c2e3d-4a5b-6c7d-8e9f-0a1b2c3d4e5f',
    description: 'The row under review. A reference, not a join — see the class note.',
  })
  entityId!: string;

  @ApiProperty({ enum: APPROVAL_ACTIONS, example: 'pay' })
  action!: ApprovalAction;

  @ApiProperty({
    enum: ApprovalStatus,
    description: 'Starts `pending` and moves exactly once. There is no path back.',
  })
  status!: ApprovalStatus;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Why it was asked for, if anything was said.',
  })
  reason!: string | null;

  @ApiProperty({
    type: () => ApprovalPersonRefDto,
    description: 'Who asked. Taken from the access token and never reassigned.',
  })
  requestedBy!: ApprovalPersonRefDto;

  @ApiPropertyOptional({
    type: () => ApprovalPersonRefDto,
    nullable: true,
    description: 'Who decided. Null while pending.',
  })
  reviewedBy!: ApprovalPersonRefDto | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true, description: 'Null while pending.' })
  reviewedAt!: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'The reviewer’s note. Null while pending.' })
  comment!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  /** Builds the response from a row read with `APPROVAL_SELECT`. The only way one of these is made. */
  static from(approval: SelectedApproval): ApprovalResponseDto {
    return {
      id: approval.id,
      mosqueId: approval.mosqueId,
      // Widened to `string` by the `VarChar` column; narrowed back here because every writer in this
      // module validates against the closed list before the row is created.
      entity: approval.entity as ApprovalEntity,
      entityId: approval.entityId,
      action: approval.action as ApprovalAction,
      status: approval.status,
      reason: approval.reason,
      requestedBy: {
        id: approval.requestedBy.id,
        fullName: approval.requestedBy.fullName,
      },
      reviewedBy: approval.reviewedBy
        ? { id: approval.reviewedBy.id, fullName: approval.reviewedBy.fullName }
        : null,
      reviewedAt: approval.reviewedAt?.toISOString() ?? null,
      comment: approval.comment,
      createdAt: approval.createdAt.toISOString(),
      updatedAt: approval.updatedAt.toISOString(),
    };
  }
}

/** Paging figures that accompany a list response. */
export class ApprovalListMetaDto {
  @ApiProperty({ example: 1, description: '1-based, echoing what was asked for.' })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3, description: 'Rows matching the filter, ignoring paging.' })
  total!: number;

  @ApiProperty({ example: 1, description: 'Zero when nothing matches.' })
  totalPages!: number;
}

/** The envelope every approvals endpoint returns. `success` is always true — failures go to the filter. */
export class ApprovalEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Approval request retrieved successfully' })
  message!: string;

  @ApiProperty({ type: ApprovalResponseDto })
  data!: ApprovalResponseDto;
}

export class ApprovalListEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Approval requests retrieved successfully' })
  message!: string;

  @ApiProperty({ type: [ApprovalResponseDto] })
  data!: ApprovalResponseDto[];

  @ApiProperty({ type: ApprovalListMetaDto })
  meta!: ApprovalListMetaDto;
}
