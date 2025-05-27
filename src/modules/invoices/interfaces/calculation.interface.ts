export interface CalculationResult {
  total: number;
  discountTotal: number;
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
