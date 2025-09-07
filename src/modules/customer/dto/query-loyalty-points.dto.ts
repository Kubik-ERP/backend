import { ApiPropertyOptional } from '@nestjs/swagger';
import { point_type } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryLoyaltyPointsDto {
  @ApiPropertyOptional({
    example: '2025-12-31',
    description: 'Filter points by expiry date',
  })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  expiryDate?: Date;

  @ApiPropertyOptional({
    example: 'point_addition',
    description: 'Type of loyalty point to filter by',
  })
  @IsString()
  @IsOptional()
  type?: point_type;

  @ApiPropertyOptional()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsIn(['created_at', 'invoice_number', 'value', 'expiry_date', 'type'])
  @IsOptional()
  @IsString()
  orderBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderDirection?: 'asc' | 'desc' = 'asc';
}
