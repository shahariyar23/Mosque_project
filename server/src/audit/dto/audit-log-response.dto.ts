import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  type AuditAction,
  type AuditChanges,
  type AuditResource,
  type SelectedAuditLog,
} from '../types/audit-log.types';

/**
 * One audit entry, as the API returns it.
 *
 * An allow-list, like every response DTO here: `from()` builds the object field by field, so a column
 * added to `AuditLog` later is invisible until someone chooses to expose it.
 *
 * `mosqueId` is returned, which the other modules' responses deliberately do not do. It is not a leak —
 * a caller confined to one mosque only ever sees their own id here — and it is necessary for the one
 * caller who is not so confined, a platform administrator reading the trail across mosques.
 *
 * `changes` is whatever the writer recorded, after redaction. Typed as an object rather than `any` so a
 * consumer has to narrow it, and returned as `null` when the stored value is not an object at all: the
 * column is `Json`, so nothing at the type level stops a hand-written row from holding a bare string.
 */
export class AuditLogResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid', description: 'The mosque the action concerned.' })
  mosqueId!: string;

  @ApiProperty({
    enum: AUDIT_ACTIONS,
    description: 'What happened. One of a closed set — a writer cannot invent one.',
  })
  action!: AuditAction;

  @ApiProperty({
    enum: AUDIT_RESOURCES,
    description: 'What kind of thing it happened to. The brief’s `entity`.',
  })
  resource!: AuditResource;

  @ApiPropertyOptional({
    nullable: true,
    description: 'The affected row, when the action concerned one.',
  })
  resourceId!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    format: 'uuid',
    description: 'Who did it. Null for an action taken before sign-in, or after they were deleted.',
  })
  actorId!: string | null;

  @ApiProperty({
    example: 'Ahmed Hasan',
    description:
      'Recorded at the time, so the entry still reads correctly after the person changes.',
  })
  actorName!: string;

  @ApiPropertyOptional({ nullable: true, example: 'mosque_admin' })
  actorRole!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: 'object',
    additionalProperties: true,
    example: { role: { from: 'member', to: 'treasurer' } },
    description:
      'Field names and business values. Never a password, token or hash — anything whose name ' +
      'suggests one is replaced with `[redacted]` before the row is written.',
  })
  changes!: AuditChanges | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Free text, e.g. why a request was refused.',
  })
  note!: string | null;

  @ApiPropertyOptional({ nullable: true, example: '203.0.113.24' })
  ipAddress!: string | null;

  @ApiPropertyOptional({ nullable: true })
  userAgent!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  /** Builds the response from a row read with `AUDIT_LOG_SELECT`. The only way one of these is made. */
  static from(entry: SelectedAuditLog): AuditLogResponseDto {
    return {
      id: entry.id,
      mosqueId: entry.mosqueId,
      action: entry.action as AuditAction,
      resource: entry.resource as AuditResource,
      resourceId: entry.resourceId,
      actorId: entry.actorId,
      actorName: entry.actorName,
      actorRole: entry.actorRole,
      changes: asChanges(entry.changes),
      note: entry.note,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      createdAt: entry.createdAt.toISOString(),
    };
  }
}

/** Paging figures that accompany a list response. */
export class AuditLogListMetaDto {
  @ApiProperty({ example: 1, description: '1-based, echoing what was asked for.' })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 137, description: 'Rows matching the filter, ignoring paging.' })
  total!: number;

  @ApiProperty({ example: 7, description: 'Zero when nothing matches.' })
  totalPages!: number;
}

/** The envelope every audit endpoint returns. `success` is always true — failures go to the filter. */
export class AuditLogEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Audit log entry retrieved successfully' })
  message!: string;

  @ApiProperty({ type: AuditLogResponseDto })
  data!: AuditLogResponseDto;
}

export class AuditLogListEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Audit log entries retrieved successfully' })
  message!: string;

  @ApiProperty({ type: [AuditLogResponseDto] })
  data!: AuditLogResponseDto[];

  @ApiProperty({ type: AuditLogListMetaDto })
  meta!: AuditLogListMetaDto;
}

/**
 * The `Json` column as an object, or nothing.
 *
 * Prisma types the column as a union that includes `string`, `number` and an array. Every row this API
 * writes holds a plain object, so anything else came from outside the API and is not something a client
 * should be asked to interpret.
 */
function asChanges(value: SelectedAuditLog['changes']): AuditChanges | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;

  return value;
}
