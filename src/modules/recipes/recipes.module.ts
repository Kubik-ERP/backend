import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RecipesController } from './controllers/recipes.controller';
import { RecipesService } from './services/recipes.service';

@Module({
  imports: [PrismaModule],
  controllers: [RecipesController],
  providers: [RecipesService],
  exports: [RecipesService],
})
export class RecipesModule {}
