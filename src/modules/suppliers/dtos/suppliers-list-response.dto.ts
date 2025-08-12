import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { SupplierResponseDto } from './supplier-response.dto';

export class SuppliersListResponseDto {
  @ApiProperty({ type: [SupplierResponseDto] })
  @Expose()
  data: SupplierResponseDto[];

  @ApiProperty({ example: 1 })
  @Expose()
  page: number;

  @ApiProperty({ example: 10 })
  @Expose()
  pageSize: number;

  @ApiProperty({ example: 100 })
  @Expose()
  total: number;

  @ApiProperty({ example: 10 })
  @Expose()
  totalPages: number;
}
