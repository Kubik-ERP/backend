import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class IngredientDto {
  @ApiProperty({
    description: 'Inventory item ID',
    example: 'uuid-item-1',
  })
  @IsUUID()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({
    description: 'Quantity',
    example: 500,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  @Transform(({ value }) => parseFloat(value))
  qty: number;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'g',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  uom: string;

  @ApiProperty({
    description: 'Notes for ingredient',
    example: '20 Potong',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Cost for this ingredient',
    example: 32000,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  cost?: number;
}
