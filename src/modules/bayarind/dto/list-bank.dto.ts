import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ListBankDto {
  @ApiProperty({ required: false, default: '' })
  @IsString()
  @IsOptional()
  search: string = '';

  @ApiProperty({ default: 1 })
  @IsNumber()
  @IsOptional()
  page: number = 1;

  @ApiProperty({ default: 10 })
  @IsNumber()
  @IsOptional()
  itemPerPage: number = 10;
}
