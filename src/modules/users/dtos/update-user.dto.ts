// DTOs
import { CreateUserDto } from './create-user.dto';

// NestJS Libraries
import { PartialType } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
