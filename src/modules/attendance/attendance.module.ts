import { Module } from '@nestjs/common';
import { WorkingHoursController } from '../working-hours/controllers/working-hours.controller';
import { WorkingHoursService } from '../working-hours/services/working-hours.service';
import { AttendanceService } from './services/attendance.service';
import { AttendanceController } from './controllers/attendance.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService],
  imports: [PrismaModule],
})
export class AttendanceModule {}
