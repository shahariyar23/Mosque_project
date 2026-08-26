import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { AuditLogService } from './audit-log.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditLogEnvelopeDto, AuditLogListEnvelopeDto } from './dto/audit-log-response.dto';

/**
 * Reading the audit trail.
 *
 * Two routes, both `GET`, and that is the whole of it. There is no `POST`, no `PATCH` and no `DELETE`,
 * and none will be added: an audit log that can be written through its own API is a log an attacker can
 * furnish, and one that can be deleted through it is a log that will be. Entries arrive from
 * `AuditLogService.record`, called by the code performing the action, which is the only caller that
 * knows what actually happened.
 *
 * `audit.view` gates both routes and is declared once on the class. It is the registry's existing
 * permission — the brief suggested `audit_logs.view`, which would have been a second name for the same
 * authority and a second thing to keep in step. Today it reaches `super_admin` and `mosque_admin` and
 * nobody else, which is the intended audience.
 *
 * The mosque is not a parameter here. `AuditLogService` takes it from the authenticated user, so there is
 * nothing in the request for a caller to substitute.
 */
@ApiTags('Audit Log')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
@ApiForbiddenResponse({ description: 'Authenticated, but without `audit.view`.' })
@Permissions('audit.view')
@Controller('admin/audit-logs')
export class AuditLogsController {
  constructor(private readonly audit: AuditLogService) {}

  @Get()
  @ApiOperation({
    summary: 'List audit log entries.',
    description:
      'Requires `audit.view`. Newest first, paginated, capped at 100 rows per page. Confined to the ' +
      'caller’s own mosque unless they hold `platform.manage`. `action` and `entity` filter on the ' +
      'recorded action and the kind of thing it concerned; `userId` filters on who did it; `from` and ' +
      '`to` are calendar days, both inclusive.',
  })
  @ApiOkResponse({ description: 'A page of entries.', type: AuditLogListEnvelopeDto })
  @ApiBadRequestResponse({
    description: 'A query parameter failed validation, or `to` precedes `from`.',
  })
  async findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: AuditLogQueryDto,
  ): Promise<AuditLogListEnvelopeDto> {
    const { rows, meta } = await this.audit.findMany(actor, query);

    return {
      success: true,
      message: 'Audit log entries retrieved successfully',
      data: rows,
      meta,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Read one audit log entry.',
    description:
      'Requires `audit.view`. Another mosque’s entry is a 404 rather than a 403 — confirming that an ' +
      'entry exists is itself a disclosure.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'The entry id.' })
  @ApiOkResponse({ description: 'The entry.', type: AuditLogEnvelopeDto })
  @ApiNotFoundResponse({ description: 'No such entry, or it belongs to another mosque.' })
  async findOne(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuditLogEnvelopeDto> {
    return {
      success: true,
      message: 'Audit log entry retrieved successfully',
      data: await this.audit.findOne(actor, id),
    };
  }
}
