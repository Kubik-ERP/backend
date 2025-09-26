import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CategoryDetailDto {
  @ApiProperty()
  @IsUUID('4')
  id: string;

  @ApiProperty()
  @IsString()
  name: string;
}

export class PreviewImportProductsDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('4')
  batchId?: string;
}

export class ImportProductsPreviewItemDto {
  @ApiProperty()
  @IsNumber()
  row_number: number;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  discount_price?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  picture_url?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  is_percent?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('4')
  stores_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('4')
  category_id?: string;

  @ApiProperty({ required: false, type: CategoryDetailDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CategoryDetailDto)
  category?: CategoryDetailDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  error_messages?: string;
}

export class ImportProductsPreviewResponseDto {
  @ApiProperty({
    example: '12345678-1234-1234-1234-123456789012',
    description: 'Unique batch ID for this import session',
  })
  batch_id: string;

  @ApiProperty({
    example: 10,
    description: 'Total number of rows processed',
  })
  total_rows: number;

  @ApiProperty({
    example: 8,
    description: 'Number of rows with valid data',
  })
  valid_rows: number;

  @ApiProperty({
    example: 2,
    description: 'Number of rows with validation errors',
  })
  invalid_rows: number;

  @ApiProperty({
    description: 'Successfully validated data ready for import',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Temporary ID for this row' },
        row_number: { type: 'number', description: 'Excel row number' },
        name: { type: 'string', description: 'Product name' },
        price: { type: 'number', description: 'Product price' },
        discount_price: {
          type: 'number',
          description: 'Product discount price',
        },
        is_percent: {
          type: 'boolean',
          description: 'Is discount in percentage',
        },
        category_id: { type: 'string', description: 'Category ID' },
        category: {
          type: 'object',
          description: 'Category details',
          properties: {
            id: { type: 'string', description: 'Category ID' },
            name: { type: 'string', description: 'Category name' },
          },
        },
      },
    },
  })
  success_data: Array<{
    id: string;
    row_number: number;
    name: string;
    price: number;
    discount_price?: number;
    is_percent: boolean;
    category_id: string;
    category?: CategoryDetailDto;
  }>;

  @ApiProperty({
    description: 'Data with validation errors that failed to import',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Temporary ID for this row' },
        row_number: { type: 'number', description: 'Excel row number' },
        name: { type: 'string', description: 'Product name value from Excel' },
        price: {
          type: 'number',
          description: 'Product price value from Excel',
        },
        discount_price: {
          type: 'number',
          description: 'Product discount price value from Excel',
        },
        is_percent: {
          type: 'boolean',
          description: 'Is discount in percentage value from Excel',
        },
        category_id: {
          type: 'string',
          description: 'Category ID value from Excel',
        },
        category: {
          type: 'object',
          description: 'Category details (if valid)',
          properties: {
            id: { type: 'string', description: 'Category ID' },
            name: { type: 'string', description: 'Category name' },
          },
        },
        error_messages: {
          type: 'string',
          description: 'Validation error messages',
        },
      },
    },
  })
  failed_data: Array<{
    id: string;
    row_number: number;
    name: string;
    price?: number;
    discount_price?: number;
    is_percent: boolean;
    category_id?: string;
    category?: CategoryDetailDto;
    error_messages: string;
  }>;
}
