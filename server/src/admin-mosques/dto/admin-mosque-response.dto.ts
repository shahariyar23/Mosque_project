import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminMosqueSummaryDto {
  @ApiProperty({ example: '3f1a7c2e-9b4d-4f6a-8c11-2d5e7a9b0c31' })
  id: string;

  @ApiProperty({ example: 'noor-jame-masjid' })
  slug: string;

  @ApiPropertyOptional({ example: 'MOS-001' })
  code: string | null;

  @ApiPropertyOptional({ example: 'uttara.mostak.tech' })
  domain: string | null;

  @ApiProperty({ example: 'Noor Jame Masjid' })
  name: string;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: 'contact@noormosque.org' })
  email: string | null;

  @ApiPropertyOptional({ example: '+880 1712 345678' })
  phone: string | null;

  @ApiPropertyOptional({ example: 'Dhaka' })
  city: string | null;

  @ApiPropertyOptional({ example: 'Bangladesh' })
  country: string | null;

  @ApiProperty({ example: 'Asia/Dhaka' })
  timezone: string;

  @ApiProperty({ example: 12 })
  userCount: number;

  @ApiProperty({ example: 3 })
  adminCount: number;

  @ApiProperty({ example: 5 })
  eventCount: number;

  @ApiProperty({ example: 4 })
  announcementCount: number;

  @ApiProperty({
    example: {
      usersCount: 12,
      adminsCount: 3,
      eventsCount: 5,
      announcementsCount: 4,
      bookingsCount: 6,
      totalRevenue: 125000,
    },
  })
  stats: {
    usersCount: number;
    adminsCount: number;
    eventsCount: number;
    announcementsCount: number;
    bookingsCount: number;
    totalRevenue: number;
  };

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class MosqueStatsDto {
  @ApiProperty({ example: 12 })
  usersCount: number;

  @ApiProperty({ example: 3 })
  adminsCount: number;

  @ApiProperty({ example: 5 })
  eventsCount: number;

  @ApiProperty({ example: 4 })
  announcementsCount: number;

  @ApiProperty({ example: 6 })
  bookingsCount: number;

  @ApiProperty({ example: 125000 })
  totalRevenue: number;
}

export class PlatformMetricsDto {
  @ApiProperty({ example: 2 })
  totalMosques: number;

  @ApiProperty({ example: 2 })
  activeMosques: number;

  @ApiProperty({ example: 0 })
  suspendedMosques: number;

  @ApiProperty({ example: 12 })
  totalUsers: number;

  @ApiProperty({ example: 8 })
  totalMembers: number;

  @ApiProperty({ example: 4 })
  totalStaff: number;

  @ApiProperty({ example: 5 })
  totalEvents: number;

  @ApiProperty({ example: 6 })
  totalBookings: number;

  @ApiProperty({ example: 4 })
  totalAnnouncements: number;

  @ApiProperty({ example: 125000 })
  totalRevenue: number;
}

export class PlatformChartPointDto {
  @ApiProperty({ example: 'Noor Jame Masjid' })
  label: string;

  @ApiProperty({ example: 12 })
  value: number;
}

export class PlatformChartsDto {
  @ApiProperty({ type: [PlatformChartPointDto] })
  mosqueStatus: PlatformChartPointDto[];

  @ApiProperty({ type: [PlatformChartPointDto] })
  membersByMosque: PlatformChartPointDto[];

  @ApiProperty({ type: [PlatformChartPointDto] })
  eventsByMosque: PlatformChartPointDto[];

  @ApiProperty({ type: [PlatformChartPointDto] })
  bookingsByMosque: PlatformChartPointDto[];

  @ApiProperty({ type: [PlatformChartPointDto] })
  revenueByMosque: PlatformChartPointDto[];
}

export class MosqueComparisonRowDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  code: string | null;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  city: string | null;

  @ApiPropertyOptional()
  country: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty({ type: MosqueStatsDto })
  stats: MosqueStatsDto;

  @ApiPropertyOptional()
  lastActivity: string | null;
}

export class PlatformOverviewDto {
  @ApiProperty({ type: PlatformMetricsDto })
  metrics: PlatformMetricsDto;

  @ApiProperty({ type: PlatformChartsDto })
  charts: PlatformChartsDto;

  @ApiProperty({ type: [MosqueComparisonRowDto] })
  comparison: MosqueComparisonRowDto[];
}

export class AdminMosqueDetailDto extends AdminMosqueSummaryDto {
  @ApiPropertyOptional()
  website: string | null;

  @ApiPropertyOptional()
  addressLine: string | null;

  @ApiPropertyOptional()
  district: string | null;

  @ApiPropertyOptional()
  postalCode: string | null;

  @ApiPropertyOptional()
  establishedYear: number | null;

  @ApiPropertyOptional()
  description: string | null;

  @ApiPropertyOptional()
  logoUrl: string | null;

  @ApiProperty({
    example: [
      {
        id: '9c8b7a65-4321-4f6a-8c11-2d5e7a9b0c31',
        fullName: 'Abdul Karim',
        email: 'admin@noor.example',
        phone: '+8801700000002',
        role: 'mosque_admin',
        isActive: true,
      },
    ],
  })
  administrators: Array<{
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    role: string;
    isActive: boolean;
  }>;
}

