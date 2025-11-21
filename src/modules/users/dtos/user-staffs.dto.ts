import { IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserStaffsDto {
  // @IsArray()
  // @IsUUID('4', { each: true })
  // @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @ApiProperty({
    example:
      '123e4567-e89b-12d3-a456-426614174000,123e4567-e89b-12d3-a456-426614174001',
    description: 'Array of store IDs - digunain untuk report',
    required: false,
  })
  @IsOptional()
  store_ids?: string;
}
