import { PartialType } from '@nestjs/swagger';
import { CreateEmployeeCommissionLogDto } from './create-employee-commission-log.dto';

export class UpdateEmployeeCommissionLogDto extends PartialType(CreateEmployeeCommissionLogDto) {}
