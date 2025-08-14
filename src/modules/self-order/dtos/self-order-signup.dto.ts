import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SelfOrderSignUpDto {
  @ApiProperty({ example: 'CUST-001', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '628123456789', required: false })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiProperty({
    description: 'Target store ID (UUID)',
    example: 'b4b7a2a8-9c9a-4e4d-8b7f-1234567890ab',
  })
  @IsUUID()
  @IsNotEmpty()
  storeId!: string;
}
