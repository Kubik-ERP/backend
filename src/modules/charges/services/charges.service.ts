import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpsertChargeDto } from '../dtos/charges.dto';
import { charge_type, charges, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { requireStoreId } from 'src/common/helpers/common.helpers';

@Injectable()
export class ChargesService {
  private readonly logger = new Logger(ChargesService.name);

  constructor(private readonly _prisma: PrismaService) {}

  public async upsertCharge(
    request: UpsertChargeDto,
    req: ICustomRequestHeaders,
  ) {
    const store_id = requireStoreId(req);

    // check the tax or service is already setup by type
    const charge = await this.getChargeByType(request.chargeType, store_id);

    if (charge == null) {
      // if tax or service not exist create
      const chargeData = {
        id: uuidv4(),
        name: request.name,
        percentage: new Prisma.Decimal(request.percentage),
        type: request.chargeType,
        applied_to_takeaway: request.appliedToTakeaway,
        is_enabled: request.isEnabled,
        is_include: request.isInclude,
        store_id: store_id,
      };

      return await this.create(chargeData);
    } else {
      // if tax or service exist update
      charge.name = request.name;
      charge.percentage = new Prisma.Decimal(request.percentage);
      charge.applied_to_takeaway = request.appliedToTakeaway;
      charge.is_include = request.isInclude;
      charge.is_enabled = request.isEnabled;
      charge.store_id = store_id;

      await this.update(charge);
      return charge;
    }
  }

  public async chargeList(req: ICustomRequestHeaders) {
    const store_id = requireStoreId(req);

    const charges = await this.getChargeList(store_id);
    const formattedCharges = charges.map((charge) => ({
      ...charge,
      percentage: charge.percentage.toNumber(),
    }));

    return formattedCharges;
  }

  /**
   * @description Create a charge
   */
  public async create(charge: charges): Promise<charges> {
    try {
      return await this._prisma.charges.create({
        data: {
          id: charge.id,
          name: charge.name,
          percentage: charge.percentage,
          type: charge.type,
          applied_to_takeaway: charge.applied_to_takeaway,
          is_enabled: charge.is_enabled,
          is_include: charge.is_include,
          store_id: charge.store_id,
        },
      });
    } catch (error) {
      console.log(error);
      this.logger.error('Failed to insert charge');
      throw new BadRequestException('Failed to insert charge', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Update a charge by type
   */
  public async update(charge: charges): Promise<number> {
    try {
      const result = await this._prisma.charges.updateMany({
        where: { type: charge.type, store_id: charge.store_id },
        data: {
          name: charge.name,
          percentage: charge.percentage,
          applied_to_takeaway: charge.applied_to_takeaway,
          is_enabled: charge.is_enabled,
          is_include: charge.is_include,
        },
      });
      return result.count;
    } catch (error) {
      console.log(error);
      this.logger.error('Failed to update charge');
      throw new BadRequestException('Failed to update charge', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Get charge data
   */
  public async getChargeByType(type: charge_type, store_id: string) {
    try {
      return await this._prisma.charges.findFirst({
        where: { type: type, store_id: store_id },
      });
    } catch (error) {
      console.log(error);
      this.logger.error('Failed to fetch charge by type');
      throw new BadRequestException('Failed to fetch charge by type', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Get list charge data
   */
  public async getChargeList(store_id: string): Promise<charges[]> {
    try {
      return await this._prisma.charges.findMany({
        where: { is_enabled: true, store_id: store_id },
      });
    } catch (error) {
      console.log(error);
      this.logger.error('Failed to fetch charge list');
      throw new BadRequestException('Failed to fetch charge list', {
        cause: new Error(),
        description: error.message,
      });
    }
  }
}
