import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString
} from 'class-validator';

export class ShipTransferStockDto {
    @ApiProperty({
        example: 'JNE',
        required: false,
    })
    @IsOptional()
    @IsString()
    logistic_provider?: string;

    @ApiProperty({
        example: 'JNE-001',
        required: false,
    })
    @IsOptional()
    @IsString()
    tracking_number?: string;

    @ApiProperty({
        example: 'Jangan dibanting',
        required: false,
    })
    @IsOptional()
    @IsString()
    delivery_note?: string;
}