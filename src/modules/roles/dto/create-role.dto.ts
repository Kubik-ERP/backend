import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiPropertyOptional({
    example: 'Kasir',
    description: 'Role untuk kasir',
  })
  @IsOptional()
  @IsString()
  name?: string;
}
