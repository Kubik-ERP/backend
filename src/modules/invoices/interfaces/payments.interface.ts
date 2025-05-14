export interface PaymentGateway {
  initiatePayment(orderId: string, amount: number): Promise<any>;
}
