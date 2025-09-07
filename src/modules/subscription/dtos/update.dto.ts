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
  package_name: string;

  @IsBoolean()
  is_active: boolean;

  // tambahkan access
  @IsArray()
  @IsUUID('4', { each: true })
  access_id: string[];
}
