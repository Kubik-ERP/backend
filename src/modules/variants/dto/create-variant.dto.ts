import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateVariantDto {
  @IsUUID()
  id: string;

  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  price?: number;
}
