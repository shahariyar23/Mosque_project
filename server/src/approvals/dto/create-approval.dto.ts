import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import {
  APPROVAL_ACTIONS,
  APPROVAL_ENTITIES,
  type ApprovalAction,
  type ApprovalEntity,
} from '../types/approval.types';

/** How long a reason may be. Generous — the field exists to be used, not to be abbreviated. */
export const MAX_APPROVAL_REASON = 2000;

/**
 * What raising a request needs.
 *
 * Three identifying fields and an optional sentence. There is no `mosqueId` and no `requestedById`:
 * both come from the access token. A body that could name either would let a caller raise a request in
 * another mosque, or in somebody else's name — and the second is worse, because the whole rule this
 * module enforces is about who asked.
 *
 * There is no `status` either. A request begins `pending` because that is what raising one means, and a
 * caller who could post `approved` would have approved their own request through the create route.
 */
export class CreateApprovalDto {
  @ApiProperty({
    enum: APPROVAL_ENTITIES,
    example: 'expense',
    description:
      'The kind of thing needing review. A closed list, checked here rather than by the database — ' +
      'the column is generic so one table can serve every module, which means nothing below this ' +
      'point would catch a typo.',
  })
  @IsIn(APPROVAL_ENTITIES, {
    message: `entity must be one of: ${APPROVAL_ENTITIES.join(', ')}`,
  })
  entity!: ApprovalEntity;

  @ApiProperty({
    example: '9f1c2e3d-4a5b-6c7d-8e9f-0a1b2c3d4e5f',
    maxLength: 64,
    description:
      'The row under review. Not resolved or joined to: this table holds a reference, and a reviewer ' +
      'opens the target through the module that owns it. Typically a UUID, but not required to be ' +
      'one — the column is `VarChar(64)` so a future module with a different key still fits.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  entityId!: string;

  @ApiProperty({
    enum: APPROVAL_ACTIONS,
    example: 'pay',
    description: 'What is proposed. `view` is absent — reading needs no approval.',
  })
  @IsIn(APPROVAL_ACTIONS, {
    message: `action must be one of: ${APPROVAL_ACTIONS.join(', ')}`,
  })
  action!: ApprovalAction;

  @ApiPropertyOptional({
    maxLength: MAX_APPROVAL_REASON,
    example: 'Invoice is above the treasurer’s own limit; supplier needs paying before Friday.',
    description:
      'Why it is being asked for, in the requester’s words. Optional: an expense over the threshold ' +
      'often needs no explanation beyond the expense itself.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_APPROVAL_REASON)
  reason?: string;
}
