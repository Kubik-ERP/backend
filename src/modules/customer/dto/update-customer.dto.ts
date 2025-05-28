import { PartialType } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @IsOptional()
  @IsNotEmpty()
  name: string;
  @IsOptional()
  @IsString()
  phone_number?: string;
}
