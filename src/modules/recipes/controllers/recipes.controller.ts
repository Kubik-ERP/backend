import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateRecipeDto } from '../dtos/create-recipe.dto';
import { RecipeResponseDto } from '../dtos/recipe-response.dto';
import { RecipesService } from '../services/recipes.service';

@ApiTags('Recipes')
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new recipe' })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 201,
    description: 'Recipe created successfully',
    type: RecipeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  async create(
    @Body() createRecipeDto: CreateRecipeDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const recipe = await this.recipesService.create(createRecipeDto, req);
    return {
      success: true,
      message: 'Recipe created successfully',
      data: recipe,
    };
  }
}
