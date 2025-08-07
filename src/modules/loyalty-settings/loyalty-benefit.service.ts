import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBenefitDto } from './dto/create-benefit.dto';
import { LoyaltyProductItemQueryDto } from './dto/loyalty-product-items-query.dto';
import { UpdateBenefitDto } from './dto/update-benefit.dto';

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

  async update(id: string, updateBenefitDto: UpdateBenefitDto) {
    console.log('Update Benefit DTO:', updateBenefitDto);
    const existingBenefit = await this.prisma.loyalty_points_benefit.findUnique(
      {
        where: { id },
      },
    );
    if (!existingBenefit) {
      throw new NotFoundException('Loyalty benefit not found');
    }
    if (existingBenefit.type === 'free_items' && updateBenefitDto.items) {
      try {
        console.log(
          'Deleting existing item benefits for benefit ID:',
          existingBenefit.id,
        );
        await this.prisma.benefit_free_items.deleteMany({
          where: { loyalty_point_benefit_id: existingBenefit.id },
        });
        const itemBenefits = updateBenefitDto.items.map((item) => ({
          loyalty_point_benefit_id: existingBenefit.id,
          product_id: item.productId,
          quantity: item.quantity,
        }));
        await this.prisma.benefit_free_items.createMany({
          data: itemBenefits,
        });
      } catch (error) {
        console.error('Error deleting existing item benefits:', error);
        throw new BadRequestException('Error updating loyalty point items');
      }
    }
    const updatedBenefit = await this.prisma.loyalty_points_benefit.update({
      where: { id },
      data: {
        discount_value:
          updateBenefitDto.value || existingBenefit.discount_value,
        is_percent: updateBenefitDto.isPercent || existingBenefit.is_percent,
        benefit_name:
          updateBenefitDto.benefitName || existingBenefit.benefit_name,
        points_needs:
          updateBenefitDto.pointNeeds || existingBenefit.points_needs,
      },
      include: {
        benefit_free_items: {
          include: {
            products: true,
          },
        },
      },
    });
    return updatedBenefit;
  }

  remove(id: number) {
    return `This action removes a #${id} loyaltySetting`;
  }
}
