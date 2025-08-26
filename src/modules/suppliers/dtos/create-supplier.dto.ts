import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({
    description: 'Supplier name',
    required: true,
    example: 'PT Supplier Utama',
  })
  @IsNotEmpty()
  @IsString()
  supplierName: string;

  @ApiProperty({
    description:
      'Supplier code. If not provided, will be auto-generated based on supplier name. ' +
      'Auto-generation rules: 2+ words = first letter of first 2 words, ' +
      '1 word = first 2 letters, followed by 4-digit counter (e.g., SU0001)',
    required: false,
    example: 'SU0001',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({
    description: 'Contact person name',
    required: true,
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  contactPerson: string;

  @ApiProperty({
    description: 'Phone number',
    required: true,
    example: '08123456789',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  phoneNumber: string;

  @ApiProperty({
    description: 'Email address',
    required: false,
    example: 'supplier@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Address',
    required: false,
    example: 'Jl. Contoh No. 123, Jakarta',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Bank name',
    required: false,
    example: 'Bank Central Asia',
  })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({
    description: 'Bank account number',
    required: false,
    example: '1234567890',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankAccountNumber?: string;

  @ApiProperty({
    description: 'Bank account name',
    required: false,
    example: 'PT Supplier Utama',
  })
  @IsOptional()
  @IsString()
  bankAccountName?: string;

  @ApiProperty({
    description: 'Tax identification number',
    required: false,
    example: '123456789012345',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxIdentificationNumber?: string;
}
