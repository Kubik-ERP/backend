import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

export class SupplierResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'PT Supplier Utama' })
  @Expose()
  supplierName: string;

  @ApiProperty({ example: 'John Doe' })
  @Expose()
  contactPerson: string;

  @ApiProperty({ example: '08123456789' })
  @Expose()
  phoneNumber: string;

  @ApiProperty({ example: 'supplier@example.com' })
  @Expose()
  email: string;

  @ApiProperty({ example: 'Jl. Contoh No. 123, Jakarta' })
  @Expose()
  address: string;

  @ApiProperty({ example: 'Bank Central Asia' })
  @Expose()
  bankName: string;

  @ApiProperty({ example: '1234567890' })
  @Expose()
  bankAccountNumber: string;

  @ApiProperty({ example: 'PT Supplier Utama' })
  @Expose()
  bankAccountName: string;

  @ApiProperty({ example: '123456789012345' })
  @Expose()
  taxIdentificationNumber: string;

  @ApiProperty({ example: '2025-08-05T12:00:00.000Z' })
  @Expose()
  @Transform(({ value }) =>
    value instanceof Date ? value.toISOString() : value,
  )
  createdAt: string;

  @ApiProperty({ example: '2025-08-05T12:00:00.000Z' })
  @Expose()
  @Transform(({ value }) =>
    value instanceof Date ? value.toISOString() : value,
  )
  updatedAt: string;
}
