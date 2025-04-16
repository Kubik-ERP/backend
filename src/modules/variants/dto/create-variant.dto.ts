import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateVariantDto {

  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsNumber()
  price?: number;
}
