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
    productId: string;
    variantId?: string;
    productPrice: number;
    variantPrice: number;
    discountAmount: number;
    qty: number;
    subtotal: number;
  }[];
}
