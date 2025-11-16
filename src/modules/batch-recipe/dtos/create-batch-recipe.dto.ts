import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateBatchRecipeDto {
  @ApiProperty({
    description: 'Recipe ID that will be batched',
    example: 'a3a5d3ff-9ecf-4a7b-a7d6-10a326b6a4c3',
  })
  @IsUUID()
  @IsNotEmpty()
  recipeId: string;

  @ApiProperty({
    description: 'Production date for the batch (ISO date string)',
    example: '2024-05-01',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Target yield for this batch',
    example: 25,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  batchTargetYield: number;

  @ApiProperty({
    description: 'Notes for the batch (optional)',
    example: 'Preparation for weekend stock',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  notes?: string;

  @ApiProperty({
    description: 'Initial batch waste amount',
    example: 1.5,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : parseFloat(value),
  )
  batchWaste?: number;
}
