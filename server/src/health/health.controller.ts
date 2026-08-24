import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Liveness and readiness, kept separate because an orchestrator does different things with them.
 *
 * `/health` answers as long as the process is up, so a temporary database outage does not get the
 * container restarted. `/health/ready` reports whether this instance can actually serve traffic,
 * which is what a load balancer should gate on.
 *
 * Both are public — a probe has no credentials — and both stay deliberately terse: an unauthenticated
 * endpoint should not describe the deployment.
 *
 * `VERSION_NEUTRAL` is what keeps these two off the version segment, and it is not optional. Escaping
 * `/api/v1` takes two independent opt-outs: `exclude` in `setGlobalPrefix` removes the `api` prefix,
 * and this removes the `v1`. Nest builds the version into the path *before* it considers the exclusion
 * list, and matches that list against the path with the version stripped back off — so a route can be
 * excluded from the prefix and still be mounted under `/v1`. Without this decorator these probes live
 * at `/v1/health`, which is a versioned URL for an endpoint whose whole purpose is to be the one URL
 * that never moves.
 */
@ApiTags('Health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness probe. Up as long as the process is running.' })
  live(): { status: 'ok'; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe. Reports whether the database is reachable.' })
  async ready(): Promise<{ status: 'ok' | 'degraded'; database: 'up' | 'down' }> {
    const healthy = await this.prisma.isHealthy();
    return { status: healthy ? 'ok' : 'degraded', database: healthy ? 'up' : 'down' };
  }
}
