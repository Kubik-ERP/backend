import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePaymentMethodDto {
  @ApiProperty({ description: 'name', required: true, example: 'DANA' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'iconName', required: true, example: 'dana' })
  @IsNotEmpty()
  @IsString()
  iconName: string;

  @ApiProperty({ description: 'sortNo', required: true, example: '1' })
  @IsNotEmpty()
  @IsInt()
  sortNo: number;

  @ApiProperty({ description: 'isAvailable', required: true, example: 'true' })
  @IsNotEmpty()
  @IsBoolean()
  isAvailable: boolean;

  @IsOptional()
  @IsString()
  image?: string;
}
