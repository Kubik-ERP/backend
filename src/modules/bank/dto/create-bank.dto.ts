import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, MaxLength, IsNumber } from 'class-validator';

export class CreateBankDto {
  @ApiProperty({ example: 'Bank Central Asia' })
  @IsString()
  @MaxLength(45)
  name: string;
}

export class AttachUserBankDto {
  @ApiProperty({ example: 'uuid-bank-id' })
  @IsUUID()
  bankId: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  @MaxLength(45)
  accountNumber: string;

  @ApiProperty({ example: 'John Smith' })
  @IsString()
  @MaxLength(45)
  accountName: string;
}
