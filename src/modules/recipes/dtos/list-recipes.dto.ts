import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetRecipesDto {
  @ApiProperty({
    description: 'Page number',
    example: 1,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  @ApiProperty({
    description: 'Search term for recipe name',
    example: 'rendang',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Order by field',
    example: 'created_at',
    required: false,
    enum: ['recipe_name', 'created_at', 'updated_at', 'target_yield'],
  })
  @IsOptional()
  @IsString()
  orderBy?: 'recipe_name' | 'created_at' | 'updated_at' | 'target_yield' =
    'created_at';

  @ApiProperty({
    description: 'Order direction',
    example: 'desc',
    required: false,
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  orderDirection?: 'asc' | 'desc' = 'desc';
}

export class RecipeListItemDto {
  @ApiProperty({ description: 'Recipe ID' })
  id: string;

  @ApiProperty({ description: 'Is base recipe' })
  isBaseRecipe: boolean;

  @ApiProperty({ description: 'Recipe name' })
  recipeName: string;

  @ApiProperty({ description: 'Output unit' })
  output: string;

  @ApiProperty({ description: 'Yield target' })
  yieldTarget: number;

  @ApiProperty({ description: 'Cost per portion' })
  costPerPortion: number;

  @ApiProperty({ description: 'Margin in Rupiah' })
  marginRp: number;

  @ApiProperty({ description: 'Margin in percent' })
  marginPercent: number;

  @ApiProperty({ description: 'Last updated date' })
  updatedAt: string;
}

export class RecipeListResponseDto {
  @ApiProperty({ type: [RecipeListItemDto] })
  items: RecipeListItemDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      page: 1,
      pageSize: 10,
      total: 100,
      totalPages: 10,
    },
  })
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
