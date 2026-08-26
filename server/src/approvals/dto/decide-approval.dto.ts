import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** How long a reviewer's note may be. Same allowance as a requester's reason. */
export const MAX_APPROVAL_COMMENT = 2000;

/**
 * What a decision may carry.
 *
 * One optional field, and that is the whole body. The reviewer is the caller, the timestamp is now, and
 * the status is whichever route was called — none of the three is anything a request should be able to
 * assert. `POST /approvals/:id/approve` with an empty body is a complete, valid approval.
 *
 * `comment` is not required on a rejection, though it is the one case where it always ought to be
 * given. Forcing it produces a table full of "no": a required field that has nothing to say gets filled
 * with a character, and then the column means less than an empty one would.
 */
export class DecideApprovalDto {
  @ApiPropertyOptional({
    maxLength: MAX_APPROVAL_COMMENT,
    example: 'Approved — quotes checked against the two alternatives.',
    description:
      'The reviewer’s note, stored on the row beside the decision. Strongly encouraged on a ' +
      'rejection, where it is the only record of why, but not enforced.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_APPROVAL_COMMENT)
  comment?: string;
}
