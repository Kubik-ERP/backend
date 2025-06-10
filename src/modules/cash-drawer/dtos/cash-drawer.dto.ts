import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class OpenCashDrawerDto {
  /**
   * Saldo awal saat laci kas dibuka.
   * Tidak boleh negatif.
   * @example 500000
   */

  @ApiProperty()
  @IsUUID()
  public storeId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  balance: number;

  /**
   * ID dari user/kasir yang membuka laci kas.
   * @example 42
   */
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  /**
   * Catatan opsional.
   * @example "Modal awal shift pagi"
   */
  @ApiProperty()
  @IsString()
  @IsOptional()
  notes?: string;
}
