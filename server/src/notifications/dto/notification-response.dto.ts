import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class NotificationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  mosqueId!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'Friday Collection Recorded' })
  title!: string;

  @ApiProperty({ example: '৳10,000 recorded for Friday 2026-08-28 (Imam Salary Fund)' })
  message!: string;

  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @ApiProperty({ example: 'finance' })
  category!: string;

  @ApiProperty({ nullable: true, example: 'jummah_collection' })
  resourceType!: string | null;

  @ApiProperty({ nullable: true, format: 'uuid' })
  resourceId!: string | null;

  @ApiProperty({ nullable: true, example: '/dashboard/jumuah' })
  actionUrl!: string | null;

  @ApiProperty({ example: false })
  isRead!: boolean;

  @ApiProperty({ nullable: true, format: 'date-time' })
  readAt!: Date | null;

  @ApiProperty({ nullable: true })
  metadata!: any;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  static from(row: any): NotificationResponseDto {
    return {
      id: row.id,
      mosqueId: row.mosqueId,
      userId: row.userId,
      title: row.title,
      message: row.message,
      type: row.type,
      category: row.category,
      resourceType: row.resourceType ?? null,
      resourceId: row.resourceId ?? null,
      actionUrl: row.actionUrl ?? null,
      isRead: row.isRead,
      readAt: row.readAt ?? null,
      metadata: row.metadata ?? null,
      createdAt: row.createdAt,
    };
  }
}

export class NotificationListMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 45 })
  total!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;

  @ApiProperty({ example: 5 })
  unreadCount!: number;
}

export class NotificationListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data!: NotificationResponseDto[];

  @ApiProperty({ type: NotificationListMetaDto })
  meta!: NotificationListMetaDto;
}

export class UnreadCountResponseDto {
  @ApiProperty({ example: 5 })
  unreadCount!: number;
}
