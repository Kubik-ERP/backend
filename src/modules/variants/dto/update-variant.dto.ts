import { PartialType } from '@nestjs/swagger';
import { CreateVariantDto } from './create-variant.dto';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateVariantDto extends PartialType(CreateVariantDto) {
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  price?: number;
}
