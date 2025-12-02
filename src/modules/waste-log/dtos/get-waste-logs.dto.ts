import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetWasteLogsDto {
  @ApiProperty({ description: 'Page number', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', example: 10, minimum: 1 })
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({ description: 'Search term', required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Sort by field',
    enum: ['created_at', 'updated_at'],
    required: false,
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'created_at';

  @ApiProperty({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    required: false,
  })
  @IsString()
  @IsOptional()
  sortOrder?: string = 'desc';
}
