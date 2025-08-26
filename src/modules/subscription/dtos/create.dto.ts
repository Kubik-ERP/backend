import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  IsBoolean,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreateSubsPackageDto {
  @IsString()
  @MaxLength(100)
  @ApiProperty()
  package_name: string;

  @IsBoolean()
  @ApiProperty()
  is_active: boolean;

  // tambahkan access
  @IsArray()
  @IsUUID('4', { each: true })
  @ApiProperty()
  access_id: string[];
}
