import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * The public home page contract.
 *
 * Everything a public visitor's home page can read, projected to the minimum that renders the page:
 * no internal identifiers beyond a slug, no user or donor references, no booking counts, no fees, no
 * contact details that are not already on the public site, and no audit or ledger data. These DTOs are
 * the security boundary for the home page: a field not declared here is a field the home page cannot
 * receive, whatever the underlying table holds.
 */

export class PublicMosqueDto {
  @ApiProperty({ example: 'noor-community-mosque' })
  slug!: string;

  @ApiProperty({ example: 'Noor Community Mosque' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  addressLine!: string | null;

  @ApiPropertyOptional({ nullable: true })
  city!: string | null;

  @ApiPropertyOptional({ nullable: true })
  district!: string | null;

  @ApiPropertyOptional({ nullable: true })
  country!: string | null;

  @ApiPropertyOptional({ nullable: true })
  establishedYear!: number | null;

  @ApiPropertyOptional({ nullable: true })
  logoUrl!: string | null;
}

export class PublicJumuahEntryDto {
  @ApiPropertyOptional({
    nullable: true,
    description: 'The Friday this applies to, or null for the standing weekly schedule.',
    example: '2026-03-06',
  })
  date!: string | null;

  @ApiProperty({ example: '13:15' })
  khutbahTime!: string;

  @ApiProperty({ example: '13:45' })
  prayerTime!: string;

  @ApiPropertyOptional({ nullable: true })
  imam!: string | null;

  @ApiPropertyOptional({ nullable: true })
  location!: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  static from(row: {
    date: string | null;
    khutbahTime: string;
    prayerTime: string;
    imam: string | null;
    location: string | null;
    notes: string | null;
  }): PublicJumuahEntryDto {
    return {
      date: row.date,
      khutbahTime: row.khutbahTime,
      prayerTime: row.prayerTime,
      imam: row.imam,
      location: row.location,
      notes: row.notes,
    };
  }
}

export class PublicServiceDto {
  @ApiProperty({ example: 'janazah-funeral-service' })
  slug!: string;

  @ApiProperty({ example: 'Janazah (Funeral) Service' })
  name!: string;

  @ApiProperty({ example: 'funeral' })
  category!: string;

  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiProperty({
    example: 'Full funeral arrangement — ghusl, kafan, janazah prayer and burial coordination.',
  })
  summary!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ example: 'Imam Abdul Karim' })
  coordinator!: string;

  @ApiProperty({ example: '24 hours, every day' })
  availability!: string;

  @ApiProperty({ example: 'Main prayer hall & mortuary room' })
  location!: string;

  static from(row: {
    slug: string;
    name: string;
    category: string;
    status: string;
    summary: string;
    description: string | null;
    coordinator: string;
    availability: string;
    location: string;
  }): PublicServiceDto {
    return {
      slug: row.slug,
      name: row.name,
      category: row.category,
      status: row.status,
      summary: row.summary,
      description: row.description,
      coordinator: row.coordinator,
      availability: row.availability,
      location: row.location,
    };
  }
}

export class PublicEventDto {
  @ApiProperty({ example: 'youth-islamic-seminar' })
  slug!: string;

  @ApiProperty({ example: 'Youth Islamic Seminar' })
  title!: string;

  @ApiProperty({ example: 'education' })
  category!: string;

  @ApiProperty({ example: 'upcoming' })
  status!: string;

  @ApiProperty({ example: '2026-08-25' })
  date!: string;

  @ApiProperty({ example: '19:30' })
  startTime!: string;

  @ApiPropertyOptional({ nullable: true })
  endTime!: string | null;

  @ApiPropertyOptional({ nullable: true })
  timeLabel!: string | null;

  @ApiProperty({ example: 'Community Hall' })
  location!: string;

  @ApiPropertyOptional({ nullable: true })
  speaker!: string | null;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  imageUrl!: string | null;

  static from(row: {
    slug: string;
    title: string;
    category: string;
    status: string;
    date: string;
    startTime: string;
    endTime: string | null;
    timeLabel: string | null;
    location: string;
    speaker: string | null;
    description: string;
    imageUrl: string | null;
  }): PublicEventDto {
    return {
      slug: row.slug,
      title: row.title,
      category: row.category,
      status: row.status,
      date: row.date,
      startTime: row.startTime,
      endTime: row.endTime,
      timeLabel: row.timeLabel,
      location: row.location,
      speaker: row.speaker,
      description: row.description,
      imageUrl: row.imageUrl,
    };
  }
}

export class PublicCommunityStatsDto {
  @ApiProperty({ example: 7 })
  activeServices!: number;

  @ApiProperty({ example: 12 })
  upcomingEvents!: number;

  @ApiProperty({ example: 3 })
  publicFunds!: number;

  @ApiProperty({ example: 500 })
  members!: number;
}
