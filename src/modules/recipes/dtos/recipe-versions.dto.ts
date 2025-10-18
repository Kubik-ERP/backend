import { ApiProperty } from '@nestjs/swagger';

export class RecipeVersionDto {
  @ApiProperty({ description: 'Version ID' })
  versionId: string;

  @ApiProperty({ description: 'Version number', example: '1.2' })
  versionNumber: string;

  @ApiProperty({ description: 'Created at', example: 'Oct 1, 14:00' })
  createdAt: string;
}

export class RecipeVersionsResponseDto {
  @ApiProperty({ type: [RecipeVersionDto] })
  versions: RecipeVersionDto[];
}

export class IngredientVersionResponseDto {
  @ApiProperty({ description: 'Ingredient version ID' })
  ingredient_version_id: string;

  @ApiProperty({ description: 'Ingredient ID' })
  ingredient_id: string;

  @ApiProperty({ description: 'Item ID' })
  item_id: string;

  @ApiProperty({ description: 'Quantity' })
  qty: number;

  @ApiProperty({ description: 'Unit of measure' })
  uom: string;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty({ required: false })
  cost?: number;

  @ApiProperty({ required: false })
  inventory_item?: {
    id: string;
    item_name: string;
    brand: string;
    uom: string;
  };
}

export class RecipeVersionDetailResponseDto {
  @ApiProperty()
  version_id: string;

  @ApiProperty()
  recipe_id: string;

  @ApiProperty()
  version_number: string;

  @ApiProperty()
  recipe_name: string;

  @ApiProperty({ required: false })
  output_unit?: string;

  @ApiProperty({ required: false })
  base_recipe?: boolean;

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

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty({ required: false })
  created_by?: string;

  @ApiProperty({ type: [IngredientVersionResponseDto] })
  ingredients: IngredientVersionResponseDto[];
}
