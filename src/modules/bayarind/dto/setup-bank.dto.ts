import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsString, IsUUID } from 'class-validator';

export class SetupBankBayarindDto {
  @ApiProperty({ example: 'uuid-store-id', description: 'ID Toko di DB Lokal' })
  @IsUUID()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({ example: 'BCA', description: 'Kode Bank (sesuai Bayarind)' })
  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @ApiProperty({ example: '1234567890' })
  @IsNumberString()
  @IsNotEmpty()
  accountNumber: string;

  @ApiProperty({
    example: 'Budi Santoso',
    description: 'Nama Pemilik Rekening',
  })
  @IsString()
  @IsNotEmpty()
  accountName: string;
}
