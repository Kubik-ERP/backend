import { PartialType } from '@nestjs/swagger';
import { CreatePaymentMethodDto } from './payment-method.dto';

export class UpdatePaymentMethodDto extends PartialType(
  CreatePaymentMethodDto,
) {}
