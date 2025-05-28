export interface PaymentGateway {
  initiatePaymentSnap(orderId: string, amount: number): Promise<any>;
  initiatePaymentCoreQris(orderId: string, amount: number): Promise<any>;
}
