// Class Validator
import { IsArray, IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class VariantDto {
  @ApiProperty({ description: 'Variant ID', required: true })
  @IsNotEmpty()
  public variantId: string;

  @ApiProperty({ description: 'Variant Name', required: true })
  @IsNotEmpty()
  public variantName: string;
}

// DTO untuk Produk
class ProductDto {
  @ApiProperty({ description: 'Product ID', required: true })
  @IsNotEmpty()
  public productId: string;

  @ApiProperty({ description: 'Product Name', required: true })
  @IsNotEmpty()
  public productName: string;

  @ApiProperty({
    description: 'Variants of the product',
    type: [VariantDto],
    required: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  public variants: VariantDto[];
}

export class ProcessPaymentDto {
  @ApiProperty({ description: 'Provider of Payment Gateway', required: true })
  @IsNotEmpty()
  public provider: string;

  @ApiProperty({ description: 'Order ID', required: true })
  @IsNotEmpty()
  public orderId: string;

  @ApiProperty({ description: 'amount', required: true })
  @IsNumber()
  public amount: number;

  @ApiProperty({
    description: 'Products included in the order',
    type: [ProductDto],
    required: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductDto)
  public products: ProductDto[];
}
