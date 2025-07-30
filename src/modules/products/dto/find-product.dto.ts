import {IsArray, IsNumberString, IsOptional, IsString} from 'class-validator';
import {Type} from "class-transformer";

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
  @Type(() => String)
  category_id?: string[];
}
