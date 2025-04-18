import { PartialType } from '@nestjs/swagger';
import { CreateFloorDto } from './create-floor.dto';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateFloorDto extends PartialType(CreateFloorDto) {
  @IsNotEmpty()
  @IsString()
  floor_number: string;
}
