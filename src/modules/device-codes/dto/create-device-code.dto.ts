import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDeviceCodeDto {
  @ApiProperty({
    example: 'Device Code 1',
    description: 'Nama device code',
    required: false,
  })
  @IsNotEmpty()
  @IsString()
  name: string;
}
