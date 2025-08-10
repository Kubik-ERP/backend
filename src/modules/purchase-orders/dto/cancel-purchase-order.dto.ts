import { IsString, IsNotEmpty } from 'class-validator';

export class CancelPurchaseOrderDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
