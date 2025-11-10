import { Module } from '@nestjs/common';
import { EmployeeCommissionLogsService } from './employee-commission-logs.service';
import { EmployeeCommissionLogsController } from './employee-commission-logs.controller';

@Module({
  controllers: [EmployeeCommissionLogsController],
  providers: [EmployeeCommissionLogsService],
})
export class EmployeeCommissionLogsModule {}
