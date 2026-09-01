import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { BroadcastQueryDto } from './dto/broadcast-query.dto';
import {
  BroadcastResponseDto,
  BroadcastStatsDto,
} from './dto/broadcast-response.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import {
  NotificationListResponseDto,
  NotificationResponseDto,
  UnreadCountResponseDto,
} from './dto/notification-response.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@UseGuards(PermissionsGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Permissions('notification.viewOwn')
  @ApiOperation({
    summary: 'List notifications',
    description: 'Returns a paginated list of notifications for the authenticated user.',
  })
  @ApiResponse({ status: 200, type: NotificationListResponseDto })
  async findMany(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: NotificationQueryDto,
  ): Promise<NotificationListResponseDto> {
    return this.notificationsService.findMany(actor, query);
  }

  @Get('unread-count')
  @Permissions('notification.viewOwn')
  @ApiOperation({
    summary: 'Get unread notification count',
    description: 'Returns total count of unread notifications for the caller.',
  })
  @ApiResponse({ status: 200, type: UnreadCountResponseDto })
  async getUnreadCount(
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UnreadCountResponseDto> {
    return this.notificationsService.getUnreadCount(actor);
  }

  @Patch(':id/read')
  @Permissions('notification.viewOwn')
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Marks a specific notification belonging to the caller as read.',
  })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  async markAsRead(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsRead(actor, id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @Permissions('notification.viewOwn')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Marks all unread notifications for the caller as read.',
  })
  @ApiResponse({ status: 200, type: UnreadCountResponseDto })
  async markAllAsRead(
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UnreadCountResponseDto> {
    return this.notificationsService.markAllAsRead(actor);
  }

  @Delete(':id')
  @Permissions('notification.viewOwn')
  @ApiOperation({
    summary: 'Delete notification',
    description: 'Removes a notification belonging to the caller.',
  })
  @ApiResponse({ status: 200 })
  async delete(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.notificationsService.delete(actor, id);
  }

  // ---------------------------------------------------------------------------
  // Broadcast Endpoints
  // ---------------------------------------------------------------------------

  @Get('broadcasts')
  @Permissions('notification.send')
  @ApiOperation({
    summary: 'List outgoing broadcast notifications',
    description: 'Returns paginated list of broadcast campaigns and delivery figures.',
  })
  async findBroadcasts(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: BroadcastQueryDto,
  ) {
    return this.notificationsService.findBroadcasts(actor, query);
  }

  @Get('broadcasts/stats')
  @Permissions('notification.send')
  @ApiOperation({
    summary: 'Get broadcast statistics',
    description: 'Returns KPI metrics: total, sent, delivered, openRate.',
  })
  async getBroadcastStats(@CurrentUser() actor: AuthenticatedUser): Promise<BroadcastStatsDto> {
    return this.notificationsService.getBroadcastStats(actor);
  }

  @Post('broadcasts')
  @Permissions('notification.send')
  @ApiOperation({
    summary: 'Create and dispatch broadcast campaign',
    description: 'Composes a new broadcast message and pushes it if status is Sent.',
  })
  async createBroadcast(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateBroadcastDto,
  ): Promise<BroadcastResponseDto> {
    return this.notificationsService.createBroadcast(actor, dto);
  }

  @Post('broadcasts/:id/send')
  @Permissions('notification.send')
  @ApiOperation({
    summary: 'Send existing draft/scheduled broadcast',
    description: 'Pushes a draft broadcast message to the target audience segment.',
  })
  async sendBroadcast(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<BroadcastResponseDto> {
    return this.notificationsService.sendBroadcast(actor, id);
  }

  @Delete('broadcasts/:id')
  @Permissions('notification.send')
  @ApiOperation({
    summary: 'Delete broadcast campaign',
    description: 'Removes a broadcast message from the outbox log.',
  })
  async deleteBroadcast(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.notificationsService.deleteBroadcast(actor, id);
  }
}

