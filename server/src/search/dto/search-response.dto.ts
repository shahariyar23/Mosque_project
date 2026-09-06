import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchItemDto {
  @ApiProperty({ description: 'Target entity UUID', example: 'd3b07384-d113-460b-8d69-58b292e86b0a' })
  id: string;

  @ApiProperty({
    description: 'Entity type identifier',
    enum: [
      'user',
      'transaction',
      'donation',
      'fund',
      'campaign',
      'expense',
      'salary',
      'receipt',
      'announcement',
      'event',
      'volunteer',
    ],
    example: 'transaction',
  })
  type: string;

  @ApiProperty({ description: 'Primary display title', example: 'Donation - Abdullah Rahman' })
  title: string;

  @ApiProperty({ description: 'Secondary descriptive text', example: 'BDT 1,000 · Completed' })
  subtitle: string;

  @ApiPropertyOptional({ description: 'Contextual badge or status tag', example: 'completed' })
  badge?: string;

  @ApiProperty({ description: 'Client routing path to view details', example: '/dashboard/finance/transactions' })
  href: string;
}

export class SearchCategoryGroupDto {
  @ApiProperty({ description: 'Category unique identifier', example: 'transactions' })
  category: string;

  @ApiProperty({ description: 'Category display label', example: 'Transactions' })
  label: string;

  @ApiProperty({ description: 'Total matches found in category', example: 3 })
  totalMatches: number;

  @ApiProperty({ description: 'Top matched items for this category', type: [SearchItemDto] })
  items: SearchItemDto[];
}

export class SearchResultDataDto {
  @ApiProperty({ description: 'Query searched', example: 'Abdullah' })
  query: string;

  @ApiProperty({ description: 'Total matched results across all accessible categories', example: 7 })
  totalResults: number;

  @ApiProperty({ description: 'Grouped results per accessible entity category', type: [SearchCategoryGroupDto] })
  categories: SearchCategoryGroupDto[];
}

export class SearchEnvelopeDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Search results retrieved successfully' })
  message: string;

  @ApiProperty({ type: SearchResultDataDto })
  data: SearchResultDataDto;
}
