import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  IsIn,
  IsInt,
  Min,
} from 'class-validator';

export class StockOpnamesListDto {
  // --- pagination

  @ApiProperty({
    description: 'Page of the list',
    required: true,
    example: '1',
  })
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page: number = 1;

  @ApiProperty({
    description: 'Page size of the list',
    required: true,
    example: '10',
  })
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  pageSize: number;

  // --- order by

  @ApiProperty({
    description:
      'Field to order by. (code, createdAt, totalItemChecked, stockMismatches, status, performedBy, updatedAt)',
    required: false,
    example: 'code',
  })
  @IsOptional()
  @IsIn([
    'code',
    'createdAt',
    'totalItemChecked',
    'stockMismatches',
    'status',
    'performedBy',
    'updatedAt',
  ])
  @IsString()
  orderBy: string = 'code';

  @ApiProperty({
    description: 'Sort direction: asc or desc',
    required: false,
    example: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  @IsString()
  orderDirection: 'asc' | 'desc' = 'desc';
}
