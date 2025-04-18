import { IsNotEmpty, IsNumber, IsString, IsUUID } from 'class-validator';

export class CreateTableDto {
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
