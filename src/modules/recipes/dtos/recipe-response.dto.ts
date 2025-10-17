import { ApiProperty } from '@nestjs/swagger';

export class BaseResponseDto<T> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  data?: T;
}

export class RecipeResponseDto {
  @ApiProperty()
  recipe_id: string;

  @ApiProperty()
  recipe_name: string;

  @ApiProperty({ required: false })
  output_unit?: string;

  @ApiProperty()
  base_recipe: boolean;

  @ApiProperty({ required: false })
  product_id?: string;

  @ApiProperty({ required: false })
  target_yield?: number;

  @ApiProperty({ required: false })
  cost_portion?: number;

  @ApiProperty({ required: false })
  margin_per_selling_price_rp?: number;

  @ApiProperty({ required: false })
  margin_per_selling_price_percent?: number;

  @ApiProperty({ required: false })
  store_id?: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}
