import * as dotenv from 'dotenv';
import { Injectable } from '@nestjs/common';
import { PaymentGateway } from '../interfaces/payments.interface';
import axios from 'axios';

dotenv.config();

@Injectable()
export class MidtransProvider implements PaymentGateway {
  private readonly baseUrl = `${process.env.MIDTRANS_BASE_URL}${process.env.MIDTRANS_TRANSACTION_URL}`;
  private readonly apiKey = `${process.env.MIDTRANS_API_KEY}`;

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
