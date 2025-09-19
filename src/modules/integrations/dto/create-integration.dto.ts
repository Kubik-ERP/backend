import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateIntegrationDto {
  @ApiProperty({ description: 'isAvailable', required: true, example: 'true' })
  @IsNotEmpty()
  @Type(() => Boolean)
  isStatic: boolean;

  @IsOptional()
  @IsString()
  image?: string;
}
