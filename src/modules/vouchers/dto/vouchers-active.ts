import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class VouchersActiveDto {
  @ApiProperty({
    description: 'Search by name and code',
    required: false,
    example: 'RAMANDHAN',
  })
  @IsOptional()
  @IsString()
  search: string = '';
}
