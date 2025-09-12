import { Module } from '@nestjs/common';
import { WorkingHoursController } from './controllers/working-hours.controller';
import { WorkingHoursService } from './services/working-hours.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [WorkingHoursController],
  providers: [WorkingHoursService],
  imports: [PrismaModule],
})
export class WorkingHoursModule {}
