import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { DashboardService } from './dashboard.service';
import { DashboardOverviewEnvelopeDto } from './dto/dashboard-response.dto';

/**
 * The dashboard: one read-only overview of one mosque.
 *
 * One route, one `GET`, no writes anywhere behind it. There is no dashboard table and no dashboard row — every figure
 * is aggregated at request time from the module that owns it, so nothing here can drift out of step with the records
 * it summarises.
 *
 * **`dashboard.view` gets a caller to this route; it does not decide what they see.** Each block inside the response
 * is gated on the grant for its own subject and an ungated block is never queried: `users` needs `user.view`,
 * `finance` needs `finance.view`, `prayer` and `jumuah` need `prayer.view`, `approvals` needs `workflow.review`.
 * That split is exactly what stops a convenience endpoint from becoming a privilege escalation — the shipped role map
 * gives an `imam` and a `cashier` `dashboard.view` and gives neither of them `user.view`, and gives the imam no
 * finance grant at all. A `member` holds no `dashboard.view` and cannot reach this route at all.
 *
 * A caller holding only `dashboard.view` still gets a valid response: a timestamp, and the two blocks that carry no
 * figures. That is the correct answer rather than a 403 — they are entitled to a dashboard, and it is empty.
 *
 * **The mosque is never a parameter.** It comes from the access token, so there is no shape of request that reads
 * another mosque's overview.
 */
@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
@Permissions('dashboard.view')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Everything the caller is entitled to see about their mosque, right now.',
    description:
      'Requires `dashboard.view`. **Each block is filtered by permission and an omitted block is never queried:** ' +
      '`users` needs `user.view`, `finance` needs `finance.view`, `prayer` and `jumuah` need `prayer.view`, ' +
      '`approvals` needs `workflow.review`. Anything the caller may not see is `null` — which means "not shown to ' +
      'you", not "zero". There is no window: these are live figures, and `generatedAt` says when they were read. ' +
      '`events` and `content` are declared but untracked, because no events, article or khutbah tables exist in ' +
      'this schema yet. `prayer` is best-effort and degrades to `null` if the upstream calculation is unavailable, ' +
      'rather than failing the whole response.',
  })
  @ApiOkResponse({ description: 'The overview.', type: DashboardOverviewEnvelopeDto })
  @ApiForbiddenResponse({ description: 'Authenticated, but without `dashboard.view`.' })
  async overview(@CurrentUser() user: AuthenticatedUser): Promise<DashboardOverviewEnvelopeDto> {
    return {
      success: true,
      message: 'Dashboard overview retrieved successfully',
      data: await this.dashboard.overview(user),
    };
  }
}
