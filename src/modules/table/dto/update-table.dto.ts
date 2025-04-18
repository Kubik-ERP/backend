import { PartialType } from '@nestjs/swagger';
import { CreateTableDto } from './create-table.dto';
import { IsNotEmpty, IsNumber, IsString, IsUUID } from 'class-validator';

export class UpdateTableDto extends PartialType(CreateTableDto) {
  @IsNotEmpty()
  @IsString()
  table_code: string;

  @IsNotEmpty()
  @IsNumber()
  capacity: number;

  @IsNotEmpty()
  @IsUUID()
  floor_id: string;
}
