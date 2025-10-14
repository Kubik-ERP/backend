export interface CalculationResult {
  total: number;
  discountTotal: number;
  taxId: string;
  tax: number;
  taxInclude: boolean;
  serviceChargeId: string;
  serviceCharge: number;
  serviceChargeInclude: boolean;
  grandTotal: number;
  paymentAmount: number;
  changeAmount: number;
  items: {
    productId?: string | null;
    variantId?: string | null;
    bundlingId?: string | null;
    productPrice: number;
    variantPrice: number;
    discountAmount: number;
    qty: number;
    subtotal: number;
  }[];
  voucherAmount: number;
  /**
   * Harga sebelum potongan voucher
   */
  subTotal: number;
  /**
   * Amount adjusted due to payment rounding
   */
  roundingAdjustment?: number;
  /**
   * Payment rounding setting details
   */
  paymentRoundingSetting?: {
    id: string;
    roundingType: string;
    roundingValue: number;
    isEnabled: boolean;
  } | null;

  totalPointsEarn?: number;
  totalRedeemDiscount?: number;
}
