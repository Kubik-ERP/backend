import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreatePaymentMethodDto {
  @ApiProperty({ description: 'name', required: true, example: 'DANA' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'iconName', required: true, example: 'dana' })
  @IsNotEmpty()
  @IsString()
  icon_name: string;

  @ApiProperty({ description: 'sortNo', required: true, example: '1' })
  @IsNotEmpty()
  @IsInt()
  sort_no: number;
}
