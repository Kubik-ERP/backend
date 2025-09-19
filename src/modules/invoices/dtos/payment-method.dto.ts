import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class CreatePaymentMethodDto {
  @ApiProperty({ description: 'name', required: true, example: 'DANA' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'iconName', required: true, example: 'dana' })
  @IsNotEmpty()
  @IsString()
  iconName: string;

  @ApiProperty({ description: 'isAvailable', required: true, example: 'true' })
  @IsNotEmpty()
  @IsBoolean()
  isAvailable: boolean;
}
