import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePaymentMethodDto } from '../dtos/payment-method.dto';
import { UpdatePaymentMethodDto } from '../dtos/update-payment-method.dto';

@Injectable()
export class PaymentMethodService {
  private readonly logger = new Logger(PaymentMethodService.name);

  constructor(private readonly _prisma: PrismaService) {}

  /**
   * @description Find all payment method
   */
  public async findAllPaymentMethod(
    isSelfOrder = false,
    store: ICustomRequestHeaders,
  ) {
    const storeId = store.store_id;
    return await this._prisma.payment_methods.findMany({
      where: {
        ...(isSelfOrder
          ? {
              name: { in: ['Pay at Cashier', 'Qris'] },
            }
          : {
              name: { notIn: ['Pay at Cashier'] },
            }),
        stores_id: storeId,
      },
      orderBy: { sort_no: 'asc' },
    });
  }

  /**
   * @description Create payment method
   */
  public async createPaymentMethod(
    paymentMethod: CreatePaymentMethodDto,
    req: ICustomRequestHeaders,
  ) {
    const storeId = req.store_id;
    try {
      return await this._prisma.payment_methods.create({
        data: {
          name: paymentMethod.name,
          icon_name: paymentMethod.iconName,
          sort_no: null,
          image_url: paymentMethod.image,
          stores_id: storeId,
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
  public async updatePaymentMethodById(
    paymentMethod: UpdatePaymentMethodDto,
    id: string,
  ) {
    try {
      return await this._prisma.payment_methods.update({
        where: { id: id },
        data: {
          name: paymentMethod.name,
          icon_name: paymentMethod.iconName,
          sort_no: null,
          image_url: paymentMethod.image,
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
