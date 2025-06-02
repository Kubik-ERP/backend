import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpsertChargeDto } from '../dtos/charges.dto';
import { charge_type, charges, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ChargesService {
  private readonly logger = new Logger(ChargesService.name);

  constructor(private readonly _prisma: PrismaService) {}

  public async upsertCharge(request: UpsertChargeDto) {
    // check the tax or service is already setup by type
    const charge = await this.getChargeByType(request.chargeType);

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
      };

      return await this.create(chargeData);
    } else {
      // if tax or service exist update
      charge.name = request.name;
      charge.percentage = new Prisma.Decimal(request.percentage);
      charge.applied_to_takeaway = request.appliedToTakeaway;
      charge.is_include = request.isInclude;
      charge.is_enabled = request.isEnabled;

      await this.update(charge);
      return charge;
    }
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
        },
      });
    } catch (error) {
      console.log(error);
      this.logger.error('Failed to upsert charge');
      throw new BadRequestException('Failed to upsert charge', {
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
        where: { type: charge.type },
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
      this.logger.error('Failed to upsert charge');
      throw new BadRequestException('Failed to upsert charge', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Get charge data
   */
  public async getChargeByType(type: charge_type) {
    try {
      return await this._prisma.charges.findFirst({
        where: { type: type },
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
}
