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
import { CreateTagDto } from '../../tag/dto/create-tag.dto';

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

  @ApiPropertyOptional({ description: 'Date of birth' })
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
    type: [CreateTagDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTagDto)
  tags?: CreateTagDto[];
}
