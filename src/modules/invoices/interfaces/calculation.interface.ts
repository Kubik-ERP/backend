export interface CalculationResult {
  total: number;
  discountTotal: number;
  tax: number;
  taxInclude: boolean;
  serviceCharge: number;
  serviceChargeInclude: boolean;
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
