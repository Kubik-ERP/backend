export interface PaymentGateway {
  initiatePayment(orderId: string, amount: number): Promise<any>;
  verifyPayment(paymentId: string): Promise<any>;
}
