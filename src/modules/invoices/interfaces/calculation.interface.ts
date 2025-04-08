export interface CalculationResult {
  total: number;
  items: {
    productId: string;
    variantId?: string;
    productPrice: number;
    variantPrice: number;
    qty: number;
    subtotal: number;
  }[];
}
