import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNumber,
  IsNumberString,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterBayarindDto {
  // --- DATA PEMILIK (Owner) ---
  @ApiProperty({ example: 'Budi Santoso' })
  @IsString()
  @MinLength(3)
  ownerName: string;

  @ApiProperty({ example: 'owner@email.com' })
  @IsEmail()
  ownerEmail: string;

  @ApiProperty({ example: '08123456789' })
  @IsNumberString()
  ownerPhone: string;

  @ApiProperty({ example: '3171234567890001', description: '16 digit NIK' })
  @IsNumberString()
  @MinLength(16)
  @MaxLength(16)
  idCardNumber: string;

  @ApiProperty({ example: '1990-01-01' })
  @IsString()
  birthDate: string;

  @ApiProperty({ example: 'Jakarta' })
  @IsString()
  birthPlace: string;

  // --- DATA TAMBAHAN BAYARIND ---
  @ApiProperty({ example: 3, description: 'ID Business Type Bayarind' })
  @Type(() => Number)
  @IsNumber()
  bayarindBusinessTypeId: number;

  // --- LOKASI DETAIL (ID Wilayah Bayarind) ---
  @ApiProperty({ example: 6 })
  @Type(() => Number)
  @IsNumber()
  provinceId: number;
  @ApiProperty({ example: 151 }) @Type(() => Number) @IsNumber() cityId: number;
  @ApiProperty({ example: 15 })
  @Type(() => Number)
  @IsNumber()
  districtId: number;
  @ApiProperty({ example: 92 })
  @Type(() => Number)
  @IsNumber()
  subdistrictId: number;

  @ApiProperty({ example: -6.2 })
  @Type(() => Number)
  @IsNumber()
  latitude: number;
  @ApiProperty({ example: 106.816 })
  @Type(() => Number)
  @IsNumber()
  longitude: number;

  // --- FILE DEFINITION (Swagger Only) ---
  @ApiProperty({ type: 'string', format: 'binary' }) idCardImage: any;
  @ApiProperty({ type: 'string', format: 'binary' }) businessImage: any;
  @ApiProperty({ type: 'string', format: 'binary' }) selfie: any;
}
