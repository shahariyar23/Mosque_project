import { ApiProperty } from '@nestjs/swagger';
import type { BroadcastMessage } from '@prisma/client';

export class BroadcastResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  channel!: string;

  @ApiProperty()
  audience!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  sender!: string;

  @ApiProperty({ nullable: true })
  sentAt!: string | null;

  @ApiProperty({ nullable: true })
  scheduledAt!: string | null;

  @ApiProperty()
  recipients!: number;

  @ApiProperty()
  delivered!: number;

  @ApiProperty()
  opened!: number;

  @ApiProperty()
  createdAt!: string;

  static from(b: BroadcastMessage): BroadcastResponseDto {
    const channelLabels: Record<string, string> = {
      push: 'Push',
      email: 'Email',
      sms: 'SMS',
      in_app: 'In-App',
    };

    const statusLabels: Record<string, string> = {
      draft: 'Draft',
      scheduled: 'Scheduled',
      sent: 'Sent',
      failed: 'Failed',
    };

    return {
      id: b.id,
      title: b.title,
      message: b.message,
      channel: channelLabels[b.channel] || b.channel,
      audience: b.audience,
      status: statusLabels[b.status] || b.status,
      sender: b.senderName || 'Mosque Office',
      sentAt: b.sentAt ? b.sentAt.toISOString() : null,
      scheduledAt: b.scheduledAt ? b.scheduledAt.toISOString() : null,
      recipients: b.recipients,
      delivered: b.delivered,
      opened: b.opened,
      createdAt: b.createdAt.toISOString(),
    };
  }
}

export class BroadcastStatsDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  sent!: number;

  @ApiProperty()
  delivered!: number;

  @ApiProperty()
  openRate!: number;
}
