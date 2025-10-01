import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { Transform, Type } from 'class-transformer';

export class FindAllEmployeeQueryDto {
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
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsString({ each: true })
  permission?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  store_ids?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderDirection?: 'asc' | 'desc';
}
