import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateOrUpdatePaymentRoundingSettingDto,
  PaymentRoundingSettingResponseDto,
} from '../dtos';

@Injectable()
export class PaymentRoundingSettingService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrUpdate(
    dto: CreateOrUpdatePaymentRoundingSettingDto,
    storeId: string,
  ): Promise<PaymentRoundingSettingResponseDto> {
    if (!storeId) {
      throw new BadRequestException('store_id is required');
    }

    // Check if setting already exists for this store
    const existingSetting =
      await this.prisma.payment_rounding_settings.findFirst({
        where: {
          store_id: storeId,
          deleted_at: null,
        },
      });

    let result;

    if (existingSetting) {
      // Update existing setting
      result = await this.prisma.payment_rounding_settings.update({
        where: { id: existingSetting.id },
        data: {
          is_enabled: dto.isEnabled,
          rounding_type: dto.roundingType,
          rounding_value: dto.roundingValue,
          updated_at: new Date(),
        },
      });
    } else {
      // Create new setting
      result = await this.prisma.payment_rounding_settings.create({
        data: {
          store_id: storeId,
          is_enabled: dto.isEnabled,
          rounding_type: dto.roundingType,
          rounding_value: dto.roundingValue,
        },
      });
    }

    return {
      id: result.id,
      storeId: result.store_id,
      isEnabled: result.is_enabled,
      roundingType: result.rounding_type,
      roundingValue: result.rounding_value,
      createdAt: result.created_at || new Date(),
      updatedAt: result.updated_at || new Date(),
    };
  }

  async getByStoreId(
    storeId: string,
  ): Promise<PaymentRoundingSettingResponseDto | null> {
    if (!storeId) {
      throw new BadRequestException('store_id is required');
    }

    const setting = await this.prisma.payment_rounding_settings.findFirst({
      where: {
        store_id: storeId,
        deleted_at: null,
      },
    });

    if (!setting) {
      return null;
    }

    return {
      id: setting.id,
      storeId: setting.store_id,
      isEnabled: setting.is_enabled,
      roundingType: setting.rounding_type,
      roundingValue: setting.rounding_value,
      createdAt: setting.created_at || new Date(),
      updatedAt: setting.updated_at || new Date(),
    };
  }
}
