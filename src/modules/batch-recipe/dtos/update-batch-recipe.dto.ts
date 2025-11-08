import { PartialType } from '@nestjs/swagger';
import { CreateBatchRecipeDto } from './create-batch-recipe.dto';

export class UpdateBatchRecipeDto extends PartialType(CreateBatchRecipeDto) {}
