import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';
import { PublicHomeService } from './public-home.service';

@ApiTags('Public — Mosques')
@Public()
@Controller('public/mosques')
export class PublicMosquesController {
  constructor(private readonly publicHome: PublicHomeService) {}

  @Get()
  @ApiOperation({
    summary: 'List active public mosques',
    description: 'Returns active registered mosques available for public browsing and prayer schedules.',
  })
  @ApiOkResponse({ description: 'List of active mosques.' })
  listActiveMosques() {
    return this.publicHome.listActiveMosques();
  }
}

