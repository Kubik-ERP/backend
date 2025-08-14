import { PartialType } from '@nestjs/swagger';
import { CreateCustomerPointDto } from './create-customer-point.dto';

export class UpdateCustomerPointsDto extends PartialType(
  CreateCustomerPointDto,
) {}
