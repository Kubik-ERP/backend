import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateFloorDto {
  @IsNotEmpty()
  @IsString()
  floor_number: string;
}
