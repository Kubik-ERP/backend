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
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateTagDto } from '../../tag/dto/create-tag.dto';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ description: 'Customer name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Customer code' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'Customer number' })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiPropertyOptional({ description: 'Date of birth' })
  @IsOptional()
  @IsDateString()
  dob?: string;

  @ApiPropertyOptional({ description: 'Customer point' })
  @IsOptional()
  @IsNumber()
  point?: number;

  @ApiPropertyOptional({ description: 'Gender Male/female' })
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Customer address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Customer Tag' })
  @IsOptional()
  @IsString()
  tag?: string;
}
