import { Injectable } from '@nestjs/common';
import { PaymentGateway } from '../interfaces/payments.interface';
import axios from 'axios';

@Injectable()
export class MidtransProvider implements PaymentGateway {
  private readonly baseUrl =
    'https://app.sandbox.midtrans.com/snap/v1/transactions';
  private readonly apiKey = 'SB-Mid-server-7QlwQsUJn0_lkQdsXfc7AmMC';

  async initiatePayment(orderId: string, amount: number) {
    try {
      const response = await axios.post(
        this.baseUrl,
        {
          transaction_details: {
            order_id: orderId,
            gross_amount: amount,
          },
          credit_card: { secure: true },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Basic ${Buffer.from(this.apiKey).toString('base64')}`,
          },
        },
      );

      if (response.data && response.data.token && response.data.redirect_url) {
        return {
          success: true,
          token: response.data.token,
          redirectUrl: response.data.redirect_url,
        };
      } else {
        throw new Error('Invalid response from Midtrans');
      }
    } catch (error) {
      console.error(
        'Midtrans initiatePayment error:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to initiate payment with Midtrans');
    }
  }

  async verifyPayment(paymentId: string) {
    try {
      const url = `https://api.sandbox.midtrans.com/v2/${paymentId}/status`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Basic ${Buffer.from(this.apiKey).toString('base64')}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error(
        'Midtrans verifyPayment error:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to verify payment with Midtrans');
    }
  }
}
