import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { ListOptionDto } from 'src/common/dtos/list-options.dto';

export class GetBrandsDto extends OmitType(ListOptionDto, [
  'isDeleted',
  'disablePaginate',
  'sortBy',
  'limit',
  'offset',
] as const) {
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
    description: 'Field to order by',
    required: false,
    enum: ['id', 'created_at', 'brand_name', 'updated_at'],
    example: 'created_at',
  })
  @IsOptional()
  @IsIn(['id', 'created_at', 'brand_name', 'updated_at'], {
    message:
      'orderBy must be one of the following values: id, created_at, brand_name, updated_at',
  })
  orderBy?: string;

  @ApiProperty({
    description: 'Order direction',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], {
    message: 'orderDirection must be one of the following values: asc, desc',
  })
  orderDirection?: 'asc' | 'desc';
}
