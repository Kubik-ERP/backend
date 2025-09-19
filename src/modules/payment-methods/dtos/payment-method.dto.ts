import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
  @Type(() => Boolean)
  isAvailable: boolean;

  @IsOptional()
  @IsString()
  image?: string;
}
