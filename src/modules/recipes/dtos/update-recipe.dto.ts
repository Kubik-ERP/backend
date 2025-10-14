import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { IngredientDto } from './ingredient.dto';

export class UpdateRecipeDto {
  @ApiProperty({ description: 'Recipe name', example: 'Rendang Daging' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  recipeName?: string;

  @ApiProperty({
    description: 'Output unit',
    example: 'Portion',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  outputUnit?: string;

  @ApiProperty({
    description: 'Is base recipe',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  baseRecipe?: boolean;

  @ApiProperty({
    description: 'Product ID',
    example: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({
    description: 'Target yield quantity',
    example: 20,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  targetYield?: number;

  @ApiProperty({
    description: 'Recipe ingredients',
    type: [IngredientDto],
    required: false,
    example: [
      {
        itemId: 'uuid-item-1',
        qty: 500,
        uom: 'g',
        notes: 'Bumbu Dasar',
        cost: 32000,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientDto)
  ingredients?: IngredientDto[];
}
