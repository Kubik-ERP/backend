import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCustomerPointDto {
  @ApiProperty({ example: 100 })
  @IsInt()
  @Type(() => Number)
  value: number;

  @ApiProperty({ example: '0014cc8a-748a-431b-a7f2-7449e1764f56' })
  @IsUUID()
  customer_id: string;

  @ApiPropertyOptional({ example: '51d1a702-0420-46d1-b682-7a5a73c21934' })
  @IsUUID()
  @IsOptional()
  invoice_id?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  expiry_date?: Date;

  @ApiPropertyOptional({ example: 'Adjustment refund' })
  @IsString()
  @IsOptional()
  notes?: string;
}
