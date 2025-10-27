import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BatchRecipeController } from './controllers/batch-recipe.controller';
import { BatchRecipeService } from './services/batch-recipe.service';

@Module({
  imports: [PrismaModule],
  controllers: [BatchRecipeController],
  providers: [BatchRecipeService],
  exports: [BatchRecipeService],
})
export class BatchRecipeModule {}
