import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString } from 'class-validator';

export class CreateFacilityDto {
  @ApiProperty({ example: 'Seating Capacity', required: true })
  @IsString()
  @Type(() => String)
  facility: string;

  @ApiProperty({ example: '30 Pax', required: true })
  @IsString()
  @Type(() => String)
  description: string;
}
