import {
  IsString,
  IsOptional,
  IsEmail,
  IsDateString,
  IsEnum,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { gender } from '@prisma/client';

export class CreateEmployeeDto {
  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Nama karyawan',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'Email karyawan',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: '+6281234567890',
    description: 'Nomor telepon karyawan',
  })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/profile.jpg',
    description: 'URL foto profil karyawan',
  })
  @IsOptional()
  @IsString()
  profile_url?: string;

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Tanggal mulai bekerja (format YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    example: '2025-12-31',
    description: 'Tanggal akhir bekerja (format YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    example: 'M/F',
    description: 'Jenis kelamin (male / female)',
  })
  @ApiPropertyOptional({ example: 'male', enum: gender })
  @IsOptional()
  @IsEnum(gender)
  gender?: gender;

  @IsOptional()
  @IsArray()
  @IsString({})
  roles?: string[];
}

export class CreateEmployeeHasRoleDto {
  @ApiProperty({ example: 1, description: 'ID of the staff/employee' })
  @IsNotEmpty()
  @IsString()
  staffs_id: string;

  @ApiProperty({ example: 2, description: 'ID of the role' })
  @IsNotEmpty()
  @IsString()
  roles_id: string;
}
