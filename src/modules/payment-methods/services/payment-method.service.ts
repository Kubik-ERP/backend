import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { payment_methods } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PaymentMethodService {
  private readonly logger = new Logger(PaymentMethodService.name);

  constructor(private readonly _prisma: PrismaService) {}

  /**
   * @description Find all payment method
   */
  public async findAllPaymentMethod(isSelfOrder = false) {
    return await this._prisma.payment_methods.findMany({
      where: {
        ...(isSelfOrder && {
          name: { in: ['Pay at Cashier', 'QRIS'] },
        }),
      },
      orderBy: { sort_no: 'asc' },
    });
  }

  /**
   * @description Create payment method
   */
  public async createPaymentMethod(paymentMethod: payment_methods) {
    try {
      return await this._prisma.payment_methods.create({
        data: {
          id: paymentMethod.id,
          name: paymentMethod.name,
          icon_name: paymentMethod.icon_name,
          sort_no: paymentMethod.sort_no,
        },
      });
    } catch (error) {
      console.log(error);
      throw new BadRequestException('Failed to create payment method', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description update payment method by Id
   */
  public async updatePaymentMethodById(paymentMethod: payment_methods) {
    try {
      return await this._prisma.payment_methods.update({
        where: { id: paymentMethod.id },
        data: {
          name: paymentMethod.name,
          icon_name: paymentMethod.icon_name,
          sort_no: paymentMethod.sort_no,
        },
      });
    } catch (error) {
      console.log(error);
      throw new BadRequestException('Failed to upadate payment method', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description delete payment method by Id
   */
  public async deletePaymentMethodById(id: string) {
    try {
      return await this._prisma.payment_methods.delete({
        where: { id: id },
      });
    } catch (error) {
      console.log(error);
      throw new BadRequestException('Failed to delete payment method', {
        cause: new Error(),
        description: error.message,
      });
    }
  }
}
