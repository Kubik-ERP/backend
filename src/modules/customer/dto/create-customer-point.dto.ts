import {
  IsUUID,
  IsInt,
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { point_type } from '@prisma/client';

export class CreateCustomerPointDto {
  @ApiProperty({ example: 100 })
  @IsInt()
  value: number;

  @ApiProperty({ example: '0014cc8a-748a-431b-a7f2-7449e1764f56' })
  @IsUUID()
  customer_id: string;

  @ApiPropertyOptional({ example: '51d1a702-0420-46d1-b682-7a5a73c21934' })
  @IsUUID()
  @IsOptional()
  invoice_id?: string;

  @ApiProperty({
    enum: point_type,
    example: 'point_deduction',
    description: 'Point type (must match enum exactly)',
  })
  @IsEnum(point_type)
  type: point_type;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsDateString()
  @IsOptional()
  expiry_date?: string;

  @ApiPropertyOptional({ example: 'Adjustment refund' })
  @IsString()
  @IsOptional()
  notes?: string;
}
