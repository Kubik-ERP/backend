import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class GetPermissionsByIdsDto {
  @ApiProperty({
    description: 'Array of permission IDs',
    required: true,
    type: [String],
    example: ['permission-id-1', 'permission-id-2'],
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsUUID(undefined, { each: true })
  ids: string[];
}
