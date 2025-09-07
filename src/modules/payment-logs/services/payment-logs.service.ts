import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentLogsService {
  constructor(private _prisma: PrismaService) {}

  /**
   * @description Create payment log
   */
  async insertLog(
    serviceName: string,
    url: string,
    requestBody: string,
    responseBody: string,
    statusCode: number,
    method: string,
  ) {
    try {
      return await this._prisma.payment_logs.create({
        data: {
          id: uuidv4(),
          service_name: serviceName,
          url: url,
          request_body: requestBody,
          response_body: responseBody,
          method: method,
          status_code: statusCode,
          created_at: new Date(),
        },
      });
    } catch (error) {
      // cannot breaking the payment flow
      // this can be reconciled by checking in dashboard of payment gateway
      // and logged in local logger
      console.log(error);
    }
  }
}
