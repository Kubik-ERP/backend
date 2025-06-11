import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsDateString,
  IsEmail,
  IsArray,
  ValidateNested,
  IsNumber,
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
  @IsString()
  @IsOptional()
  number?: string;

  @ApiPropertyOptional({ description: 'Date of birth' })
  @IsOptional()
  dob?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Gender Male/female' })
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ description: 'Customer address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Customer point' })
  @IsOptional()
  @IsNumber()
  point?: number;

  @ApiPropertyOptional({ description: 'Customer Tag' })
  @IsOptional()
  @IsString()
  tag?: string;


}
