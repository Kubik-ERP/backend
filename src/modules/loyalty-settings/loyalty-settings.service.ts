import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateLoyaltySettingDto } from './dto/create-loyalty-setting.dto';
import { LoyaltyProductItemQueryDto } from './dto/loyalty-product-items-query.dto';
import { UpdateLoyaltySettingDto } from './dto/update-loyalty-setting.dto';
import { UpdateSettingItemDto } from './dto/updateSettingItem.dto';

@Injectable()
export class LoyaltySettingsService {
  constructor(private readonly prisma: PrismaService) {}
  async create(
    createLoyaltySettingDto: CreateLoyaltySettingDto,
    header: ICustomRequestHeaders,
  ) {
    const { store_id } = header;
    if (!store_id) {
      throw new BadRequestException('Store ID is required');
    }
    const loyaltySetting = await this.prisma.loyalty_point_settings.create({
      data: {
        spend_based: createLoyaltySettingDto.spend_based,
        minimum_transaction:
          createLoyaltySettingDto.spend_based_min_transaction,
        points_per_transaction:
          createLoyaltySettingDto.spend_based_point_earned,
        spend_based_points_expiry_days:
          createLoyaltySettingDto.spend_based_expiration,
        spend_based_points_apply_multiple:
          createLoyaltySettingDto.spend_based_apply_multiple,
        spend_based_get_points_on_redemption:
          createLoyaltySettingDto.spend_based_earn_when_redeem,
        product_based: createLoyaltySettingDto.product_based,
        product_based_get_points_on_redemption:
          createLoyaltySettingDto.product_based_earn_when_redeem,
        product_based_points_apply_multiple:
          createLoyaltySettingDto.product_based_apply_multiple,
        product_based_points_expiry_days:
          createLoyaltySettingDto.product_based_expiration,
        storesId: store_id,
      },
    });

    try {
      if (
        createLoyaltySettingDto.product_based_items &&
        createLoyaltySettingDto.product_based_items.length > 0
      ) {
        const productItems = createLoyaltySettingDto.product_based_items.map(
          (item) => ({
            loyalty_point_setting_id: loyaltySetting.id,
            product_id: item.product_id,
            points: item.points_earned,
            minimum_transaction: item.minimum_purchase,
          }),
        );

        await this.prisma.loyalty_product_item.createMany({
          data: productItems,
        });
      }
    } catch (error) {
      throw new BadRequestException('Error creating loyalty point item');
    }
    return {
      loyaltySetting,
      productItems: createLoyaltySettingDto.product_based_items || [],
    };
  }

  async findAll(header: ICustomRequestHeaders) {
    const { store_id } = header;
    if (!store_id) {
      throw new BadRequestException('Store ID is required');
    }
    const loyaltySettings = await this.prisma.loyalty_point_settings.findFirst({
      where: { storesId: store_id },
    });
    if (!loyaltySettings) {
      throw new BadRequestException('No loyalty settings found for this store');
    }
    return {
      data: loyaltySettings,
    };
  }

  async findAllProductSettings(query: LoyaltyProductItemQueryDto, id: string) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const [totalItems, loyaltyProductItems] = await this.prisma.$transaction([
      this.prisma.loyalty_product_item.count({
        where: { loyalty_point_setting_id: id },
      }),
      this.prisma.loyalty_product_item.findMany({
        where: { loyalty_point_setting_id: id },
        skip: skip,
        take: limit,
        include: {
          products: {
            include: {
              categories_has_products: {
                include: {
                  categories: true,
                },
              },
            },
          },
        },
      }),
    ]);
    const mappedItems = loyaltyProductItems.map((item) => ({
      ...item,
      products: {
        name: item.products.name || null,
        categories: item.products.categories_has_products.map(
          (cat) => cat.categories.category,
        ),
        price: item.products.price || null,
        discountPrice: item.products.discount_price || null,
      },
    }));
    const totalPages = Math.ceil(totalItems / limit);
    return {
      data: mappedItems,
      meta: {
        page,
        pageSize: limit,
        total: totalItems,
        totalPages,
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

    await this.prisma.loyalty_product_item.deleteMany({
      where: { loyalty_point_setting_id: loyaltySetting.id },
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
      await this.prisma.loyalty_product_item.createMany({
        data: productItems,
      });
    }

    return {
      loyaltySetting,
      productItems: updateLoyaltySettingDto.product_based_items || [],
    };
  }

  async updateSettingsItem(
    updateSettingItemDto: UpdateSettingItemDto,
    id: string,
  ) {
    const existingSetting = await this.prisma.loyalty_product_item.findUnique({
      where: { id },
    });
    if (!existingSetting) {
      throw new NotFoundException('Loyalty setting item not found');
    }
    const updatedSetting = await this.prisma.loyalty_product_item.update({
      where: { id },
      data: {
        product_id:
          updateSettingItemDto.product_id ?? existingSetting.product_id,
        points: updateSettingItemDto.points_earned ?? existingSetting.points,
        minimum_transaction:
          updateSettingItemDto.minimum_purchase ??
          existingSetting.minimum_transaction,
      },
    });
    return updatedSetting;
  }

  async remove(id: string) {
    const existing = await this.prisma.loyalty_product_item.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Loyalty product item not found');
    }
    return this.prisma.loyalty_product_item.delete({
      where: { id },
    });
  }
}
