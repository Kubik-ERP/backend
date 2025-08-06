import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsUUID, IsString } from 'class-validator';

export class VouchersActiveDto {
  @ApiProperty({
    description: 'Search by name and code',
    required: false,
    example: 'RAMANDHAN',
  })
  @IsOptional()
  @IsString()
  search: string = '';

  @ApiProperty({
    description: 'Product IDs',
    required: false,
    // uuid
    example: [
      'f0b646e1-e847-4772-b538-e3b66068432c',
      'f0b646e1-e847-4772-b538-e3b66068432d',
    ],
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : Array(value)))
  productIds: string[];
}
