import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiPropertyOptional({
    required: true,
    example: 'Kasir',
    description: 'Role name',
  })
  @IsString()
  name: string;
}
