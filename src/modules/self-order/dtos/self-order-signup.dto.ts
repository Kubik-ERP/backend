import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SelfOrderSignUpDto {
  @ApiProperty({ example: '+62', required: false })
  @IsNotEmpty()
  @IsString()
  code?: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '8123456789', required: false })
  @IsString()
  @IsNotEmpty()
  number?: string;

  @ApiProperty({
    description: 'Store ID (UUID)',
    example: 'b4b7a2a8-9c9a-4e4d-8b7f-1234567890ab',
  })
  @IsUUID()
  @IsNotEmpty()
  storeId!: string;
}
