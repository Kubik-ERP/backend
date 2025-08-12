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

export class PurchaseOrdersListDto {
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

  // --- filter

  @ApiProperty({
    description: 'Search by orderNumber or supplierName',
    required: false,
    example: 'PO-001',
  })
  @IsOptional()
  search: string;

  // --- order by

  @ApiProperty({
    description:
      'Field to order by. (orderNumber, supplierName, orderDate, deliveryDate, orderStatus, totalPrice)',
    required: false,
    example: 'orderNumber',
  })
  @IsOptional()
  @IsIn([
    'orderNumber',
    'supplierName',
    'orderDate',
    'deliveryDate',
    'orderStatus',
    'totalPrice',
  ])
  @IsString()
  orderBy: string = 'orderNumber';

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
