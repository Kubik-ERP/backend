import { PartialType } from '@nestjs/swagger';
import { CreateBankDto } from './create-bank.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateBankDto extends PartialType(CreateBankDto) {}

export class UpdateUserBankDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsOptional()
  bankId?: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsOptional()
  @MaxLength(45)
  accountNumber?: string;

  @ApiProperty({ example: 'Nama Rekening Baru' })
  @IsString()
  @IsOptional()
  @MaxLength(45)
  accountName?: string;
}
