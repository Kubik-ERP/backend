import { PartialType } from '@nestjs/swagger';

import { CreateCustomerDto } from './create-customer.dto';
import {
  IsOptional,
  IsString,
  IsNotEmpty,
  IsDateString,
  IsEmail,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
