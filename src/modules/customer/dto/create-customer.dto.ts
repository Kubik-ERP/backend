import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsDateString,
  IsEmail,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TagDto {
  @ApiPropertyOptional({ description: 'Tag ID' })
  @IsUUID()
  id: string;
}

export class CreateCustomerDto {
  @ApiProperty({ description: 'Customer name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Customer code' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'Customer number' })
  @IsNotEmpty()
  @IsString()
  number: string;

  @ApiPropertyOptional({ description: 'Date of birth in ISO format' })
  @IsOptional()
  @IsDateString()
  dob?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Customer address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'List of tags associated with customer',
    type: [TagDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TagDto)
  customers_has_tag?: TagDto[];
}
