import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, IsIn } from 'class-validator';

export class GetSuppliersDto {
  @ApiProperty({
    description: 'Page number',
    required: false,
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    required: false,
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  pageSize?: number = 10;

  @ApiProperty({
    description: 'Search by supplier name',
    required: false,
    example: 'PT Supplier',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Order by field',
    required: false,
    example: 'created_at',
  })
  @IsOptional()
  @IsString()
  @IsIn(
    ['id', 'created_at', 'supplier_name', 'contact_person', 'phone_number'],
    {
      message:
        'orderBy must be one of the following values: created_at, supplier_name, contact_person, phone_number',
    },
  )
  orderBy?: string = 'created_at';

  @ApiProperty({
    description: 'Sort direction',
    required: false,
    example: 'desc',
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'], {
    message: 'orderDirection must be one of the following values: asc, desc',
  })
  orderDirection?: 'asc' | 'desc' = 'desc';
}
