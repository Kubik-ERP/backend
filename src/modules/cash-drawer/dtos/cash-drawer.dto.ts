import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsDateString,
  IsEmpty,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
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

export class CloseCashDrawerDto {
  /**
   * Saldo awal saat laci kas dibuka.
   * Tidak boleh negatif.
   * @example 500000
   */

  @ApiProperty()
  @IsUUID()
  public cashDrawerId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  balance: number;

  /**
   * Catatan opsional.
   * @example "Modal awal shift pagi"
   */
  @ApiProperty()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CashDrawerQueryDto {
  @ApiProperty({
    required: false,
    description: 'Page number for pagination',
    default: 1,
  })
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    required: false,
    description: 'Number of items per page',
    default: 10,
  })
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({
    required: false,
    enum: [0, 1, 2, 3, 4, 5],
    description:
      '0 => opening, 1 => cash in, 2 => sale, 3 => cash out, 4 => refund, 5 => closing. Empty string allowed.',
    default: '',
  })
  @IsOptional()
  @Matches(/^$|^[0-5]$/, { message: 'type must be 0-5 or empty string' })
  type?: string = '';

  @ApiProperty({
    required: false,
    description: 'Start date in DD-MM-YYYY format. Empty string allowed.',
    default: '',
  })
  @IsOptional()
  @Matches(/^$|^\d{2}-\d{2}-\d{4}$/, {
    message: 'startDate must be empty or in DD-MM-YYYY format',
  })
  startDate?: string = '';

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @Matches(/^$|^\d{2}-\d{2}-\d{4}$/, {
    message: 'endDate must be empty or in DD-MM-YYYY format',
  })
  endDate?: string = '';
}
