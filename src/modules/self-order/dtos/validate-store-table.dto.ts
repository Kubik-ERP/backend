import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class ValidateStoreTableDto {
  @ApiProperty({
    description: 'Store ID to validate',
    example: 'acc588cd-8f1b-4517-9fa2-7bfd905b458c',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  storeId: string;

  @ApiProperty({
    description: 'Table name to validate',
    example: 'A1',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  tablesName: string;
}
