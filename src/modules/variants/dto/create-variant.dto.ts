import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVariantDto {
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  price?: number;
}
