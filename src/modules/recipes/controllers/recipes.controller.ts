import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
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
import { UpdateRecipeDto } from '../dtos/update-recipe.dto';
import { RecipeResponseDto } from '../dtos/recipe-response.dto';
import { RecipeDetailResponseDto } from '../dtos/recipe-detail-response.dto';
import { GetRecipesDto, RecipeListResponseDto } from '../dtos/list-recipes.dto';
import {
  RecipeVersionsResponseDto,
  RecipeVersionDetailResponseDto,
} from '../dtos/recipe-versions.dto';
import { RecipesService } from '../services/recipes.service';

@ApiTags('Recipes')
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get list of recipes' })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 200,
    description: 'Recipes retrieved successfully',
    type: RecipeListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid query parameters',
  })
  async list(@Query() query: GetRecipesDto, @Req() req: ICustomRequestHeaders) {
    const recipes = await this.recipesService.list(query, req);
    return {
      success: true,
      message: 'Recipes retrieved successfully',
      result: recipes,
    };
  }

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
      result: recipe,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get recipe details by ID' })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 200,
    description: 'Recipe details retrieved successfully',
    type: RecipeDetailResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Recipe not found',
  })
  async findById(
    @Param('id') recipeId: string,
    @Req() req: ICustomRequestHeaders,
  ) {
    const recipe = await this.recipesService.findRecipeById(
      recipeId,
      req.store_id!,
    );
    return {
      success: true,
      message: 'Recipe details retrieved successfully',
      result: recipe,
    };
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a recipe' })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 200,
    description: 'Recipe updated successfully',
    type: RecipeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Recipe not found',
  })
  async update(
    @Param('id') recipeId: string,
    @Body() updateRecipeDto: UpdateRecipeDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const recipe = await this.recipesService.updateRecipe(
      recipeId,
      updateRecipeDto,
      req.store_id!,
    );
    return {
      success: true,
      message: 'Recipe updated successfully',
      result: recipe,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a recipe' })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 200,
    description: 'Recipe deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Recipe not found',
  })
  async delete(
    @Param('id') recipeId: string,
    @Req() req: ICustomRequestHeaders,
  ) {
    await this.recipesService.deleteRecipe(recipeId, req.store_id!);
    return {
      success: true,
      message: 'Recipe deleted successfully',
    };
  }

  @Get(':id/versions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get recipe versions' })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 200,
    description: 'Recipe versions retrieved successfully',
    type: RecipeVersionsResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Recipe not found',
  })
  async getVersions(
    @Param('id') recipeId: string,
    @Req() req: ICustomRequestHeaders,
  ) {
    const versions = await this.recipesService.getRecipeVersions(
      recipeId,
      req.store_id!,
    );
    return {
      success: true,
      message: 'Recipe versions retrieved successfully',
      result: versions,
    };
  }

  @Get(':id/versions/:versionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get recipe version detail' })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 200,
    description: 'Recipe version detail retrieved successfully',
    type: RecipeVersionDetailResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Recipe or version not found',
  })
  async getVersionDetail(
    @Param('id') recipeId: string,
    @Param('versionId') versionId: string,
    @Req() req: ICustomRequestHeaders,
  ) {
    const versionDetail = await this.recipesService.getRecipeVersionDetail(
      recipeId,
      versionId,
      req.store_id!,
    );
    return {
      success: true,
      message: 'Recipe version detail retrieved successfully',
      result: versionDetail,
    };
  }
}
