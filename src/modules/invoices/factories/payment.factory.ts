import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { MidtransProvider } from '../providers/midtrans.provider';
import { PaymentGateway } from '../interfaces/payments.interface';

@Injectable()
export class PaymentFactory {
  constructor(private readonly midtransProvider: MidtransProvider) {}

  getProvider(provider: string): PaymentGateway {
    switch (provider.toLowerCase()) {
      case 'midtrans':
        return this.midtransProvider;
      default:
        throw new BadRequestException('Unsupported payment provider');
    }
  }
}
