import * as dotenv from 'dotenv';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PaymentGateway } from '../interfaces/payments.interface';
import axios from 'axios';
import { MidtransCoreQrisResponseItemDto } from '../dtos/callback-payment.dto';
import { plainToInstance } from 'class-transformer';
import { PaymentLogsService } from 'src/modules/payment-logs/services/payment-logs.service';

dotenv.config();

@Injectable()
export class MidtransProvider implements PaymentGateway {
  private baseSnapUrl = `${process.env.MIDTRANS_BASE_SNAP_URL}`;
  private baseCoreUrl = `${process.env.MIDTRANS_BASE_CORE_URL}`;
  private snapUrl = `${this.baseSnapUrl}${process.env.MIDTRANS_SNAP_URL}`;
  private qrisUrl = `${this.baseCoreUrl}${process.env.MIDTRANS_QRIS_URL}`;
  private readonly apiKey = `${process.env.MIDTRANS_API_KEY}`;

  constructor(private _paymentLogService: PaymentLogsService) {}

  async initiatePaymentSnap(orderId: string, amount: number) {
    const requestBody = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      credit_card: { secure: true },
    };
    try {
      const response = await axios.post(this.snapUrl, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Basic ${Buffer.from(this.apiKey).toString('base64')}`,
        },
      });

      // add payment logs db
      await this._paymentLogService.insertLog(
        'midtrans',
        this.qrisUrl,
        JSON.stringify(requestBody),
        JSON.stringify(response.data),
        response.status,
        'POST',
      );

      if (response.data && response.data.token && response.data.redirect_url) {
        return {
          success: true,
          token: response.data.token,
          redirectUrl: response.data.redirect_url,
        };
      } else {
        throw new InternalServerErrorException(
          'Invalid response from Midtrans',
        );
      }
    } catch (error) {
      const errorResponse = error.response?.data || error.message;
      const statusCode = error.response?.status || 500;

      // add payment logs db
      await this._paymentLogService.insertLog(
        'midtrans',
        this.qrisUrl,
        JSON.stringify(requestBody),
        JSON.stringify(errorResponse),
        statusCode,
        'POST',
      );

      console.error('Midtrans initiatePayment error:', errorResponse);
      throw new InternalServerErrorException(
        'Failed to initiate payment with Midtrans',
      );
    }
  }

  async initiatePaymentCoreQris(
    orderId: string,
    amount: number,
  ): Promise<MidtransCoreQrisResponseItemDto> {
    const requestBody = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      payment_type: 'qris',
      qris: {
        acquirer: 'gopay', // Currently Midtrans only support QRIS of Gopay
      },
    };

    try {
      const response = await axios.post(this.qrisUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
        },
      });

      // add payment logs db
      await this._paymentLogService.insertLog(
        'midtrans',
        this.qrisUrl,
        JSON.stringify(requestBody),
        JSON.stringify(response.data),
        response.status,
        'POST',
      );

      // deserialize the response
      const result = plainToInstance(
        MidtransCoreQrisResponseItemDto,
        response.data,
      );
      return result;
    } catch (error) {
      const errorResponse = error.response?.data || error.message;
      const statusCode = error.response?.status || 500;

      // add payment logs db
      await this._paymentLogService.insertLog(
        'midtrans',
        this.qrisUrl,
        JSON.stringify(requestBody),
        JSON.stringify(errorResponse),
        statusCode,
        'POST',
      );

      console.error('Midtrans initiatePayment error:', error);
      throw new InternalServerErrorException(
        `Failed to initiate payment with Midtrans: ${error}`,
      );
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
