import { IsArray, IsNumberString, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class FindAllProductsQueryDto {
  @IsOptional()
  @IsNumberString()
  page?: number;

  @IsOptional()
  @IsNumberString()
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string') return [value];
    return value;
  })
  @Type(() => String)
  category_id?: string[];
}
