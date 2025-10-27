import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CancelBatchRecipeDto } from '../dtos/cancel-batch-recipe.dto';
import { CompleteBatchRecipeDto } from '../dtos/complete-batch-recipe.dto';
import { CreateBatchRecipeDto } from '../dtos/create-batch-recipe.dto';
import {
  CancelBatchDocs,
  CompleteBatchDocs,
  CreateBatchDocs,
  StartBatchDocs,
} from './batch-recipe.docs';
import { BatchRecipeService } from '../services/batch-recipe.service';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';

@ApiTags('Batch Recipes')
@Controller('batch-recipe')
@UseGuards(AuthPermissionGuard)
export class BatchRecipeController {
  constructor(private readonly batchRecipeService: BatchRecipeService) {}

  @Post()
  @CreateBatchDocs()
  async create(
    @Body() dto: CreateBatchRecipeDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const result = await this.batchRecipeService.create(dto, req);
    return {
      success: true,
      message: 'Batch recipe berhasil dibuat',
      result,
    };
  }

  @Post(':id/start')
  @StartBatchDocs()
  async startCooking(
    @Param('id') batchId: string,
    @Req() req: ICustomRequestHeaders,
  ) {
    const result = await this.batchRecipeService.startCooking(batchId, req);
    return {
      success: true,
      message: 'Batch recipe dimulai',
      result,
    };
  }

  @Post(':id/cancel')
  @CancelBatchDocs()
  async cancelCooking(
    @Param('id') batchId: string,
    @Body() dto: CancelBatchRecipeDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const result = await this.batchRecipeService.cancelCooking(
      batchId,
      dto,
      req,
    );
    return {
      success: true,
      message: 'Batch recipe dibatalkan',
      result,
    };
  }

  @Post(':id/complete')
  @CompleteBatchDocs()
  async completeCooking(
    @Param('id') batchId: string,
    @Body() dto: CompleteBatchRecipeDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const result = await this.batchRecipeService.completeCooking(
      batchId,
      dto,
      req,
    );
    return {
      success: true,
      message: 'Batch recipe selesai dimasak',
      result,
    };
  }
}
