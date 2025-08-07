import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBenefitDto } from './dto/create-benefit.dto';
import { LoyaltyProductItemQueryDto } from './dto/loyalty-product-items-query.dto';
import { UpdateLoyaltySettingDto } from './dto/update-loyalty-setting.dto';

@Injectable()
export class LoyaltyBenefitService {
  constructor(private readonly prisma: PrismaService) {}
  async create(CreateBenefitDto: CreateBenefitDto, settingId: string) {
    if (!settingId) {
      throw new BadRequestException('Setting ID is required');
    }
    const existingSetting = await this.prisma.loyalty_point_settings.findUnique(
      {
        where: { id: settingId },
      },
    );
    if (!existingSetting) {
      throw new NotFoundException('Loyalty setting not found');
    }
    const benefit = await this.prisma.loyalty_points_benefit.create({
      data: {
        loyalty_point_setting_id: settingId,
        type: CreateBenefitDto.benefitType,
        discount_value: CreateBenefitDto.value,
        is_percent: CreateBenefitDto.isPercent,
        benefit_name: CreateBenefitDto.benefitName,
        points_needs: CreateBenefitDto.pointNeeds,
      },
    });
    if (
      CreateBenefitDto.benefitType === 'free_items' &&
      CreateBenefitDto.items
    ) {
      try {
        const itemBenefits = CreateBenefitDto.items.map((item) => ({
          loyalty_point_benefit_id: benefit.id,
          product_id: item.productId,
          quantity: item.quantity,
        }));
        await this.prisma.benefit_free_items.createMany({
          data: itemBenefits,
        });
      } catch (error) {
        console.error('Error creating item benefits:', error);
        throw new BadRequestException('Error creating loyalty point item');
      }
    }
    return {
      benefit,
      items: CreateBenefitDto.items || [],
    };
  }

  async findAll(
    header: ICustomRequestHeaders,
    query: LoyaltyProductItemQueryDto,
  ) {
    const { store_id } = header;
    if (!store_id) {
      throw new BadRequestException('Store ID is required');
    }
    const loyaltySettings = await this.prisma.loyalty_point_settings.findFirst({
      where: { storesId: store_id },
    });
    if (!loyaltySettings) {
      return {
        loyaltySettingsStatus: false,
        loyaltySettingsId: null,
      };
    }
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const [totalItems, benefits] = await this.prisma.$transaction([
      this.prisma.loyalty_points_benefit.count({
        where: { loyalty_point_setting_id: loyaltySettings.id },
      }),
      this.prisma.loyalty_points_benefit.findMany({
        where: { loyalty_point_setting_id: loyaltySettings.id },
        skip: skip,
        take: limit,
        include: {
          benefit_free_items: {
            include: {
              products: true,
            },
          },
        },
      }),
    ]);
    const totalPages = Math.ceil(totalItems / limit);
    const mappedBenefits = benefits.map((benefit) => {
      const itemBenefits = benefit.benefit_free_items.map((item) => ({
        id: item.product_id,
        name: item.products.name,
        quantity: item.quantity,
      }));
      const discount = {
        value: benefit.discount_value,
        isPercent: benefit.is_percent,
      };
      return {
        id: benefit.id,
        type: benefit.type,
        benefitName: benefit.benefit_name,
        pointNeeds: benefit.points_needs,
        discountFreeItems:
          benefit.type === 'free_items' ? itemBenefits : discount,
      };
    });
    return {
      loyaltySettingsStatus: true,
      loyaltySettingsId: loyaltySettings.id,
      loyaltyBenefits: {
        items: mappedBenefits,
        meta: {
          total: totalItems,
          page,
          limit,
          totalPages,
        },
      },
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} loyaltySetting`;
  }

  async update(id: string, updateLoyaltySettingDto: UpdateLoyaltySettingDto) {
    const existingSetting = await this.prisma.loyalty_point_settings.findUnique(
      {
        where: { id },
      },
    );
    if (!existingSetting) {
      throw new NotFoundException('Loyalty setting not found');
    }
    const loyaltySetting = await this.prisma.loyalty_point_settings.update({
      where: { id },
      data: {
        spend_based:
          updateLoyaltySettingDto.spend_based ?? existingSetting.spend_based,
        minimum_transaction:
          updateLoyaltySettingDto.spend_based_min_transaction ??
          existingSetting.minimum_transaction,
        points_per_transaction:
          updateLoyaltySettingDto.spend_based_point_earned ??
          existingSetting.points_per_transaction,
        spend_based_points_expiry_days:
          updateLoyaltySettingDto.spend_based_expiration ??
          existingSetting.spend_based_points_expiry_days,
        spend_based_points_apply_multiple:
          updateLoyaltySettingDto.spend_based_apply_multiple ??
          existingSetting.spend_based_points_apply_multiple,
        spend_based_get_points_on_redemption:
          updateLoyaltySettingDto.spend_based_earn_when_redeem ??
          existingSetting.spend_based_get_points_on_redemption,
        product_based:
          updateLoyaltySettingDto.product_based ??
          existingSetting.product_based,
        product_based_get_points_on_redemption:
          updateLoyaltySettingDto.product_based_earn_when_redeem ??
          existingSetting.product_based_get_points_on_redemption,
        product_based_points_apply_multiple:
          updateLoyaltySettingDto.product_based_apply_multiple ??
          existingSetting.product_based_points_apply_multiple,
        product_based_points_expiry_days:
          updateLoyaltySettingDto.product_based_expiration ??
          existingSetting.product_based_points_expiry_days,
      },
    });

    if (
      updateLoyaltySettingDto.product_based_items &&
      updateLoyaltySettingDto.product_based_items.length > 0
    ) {
      const productItems = updateLoyaltySettingDto.product_based_items.map(
        (item) => ({
          loyalty_point_setting_id: loyaltySetting.id,
          product_id: item.product_id,
          points: item.points_earned,
          minimum_transaction: item.minimum_purchase,
        }),
      );
      await this.prisma.loyalty_product_item.deleteMany({
        where: { loyalty_point_setting_id: loyaltySetting.id },
      });
      await this.prisma.loyalty_product_item.createMany({
        data: productItems,
      });
    }

    return {
      loyaltySetting,
      productItems: updateLoyaltySettingDto.product_based_items || [],
    };
  }

  remove(id: number) {
    return `This action removes a #${id} loyaltySetting`;
  }
}
