import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { variant as VariantModel } from '.prisma/client';
import { validate as isUUID } from 'uuid';

@Injectable()
export class VariantsService {
  constructor(private prisma: PrismaService) {}

  async create(createVariantDto: CreateVariantDto) {
    try {
      const existingVariant = await this.prisma.variant.findFirst({
        where: { name: createVariantDto.name },
      });

      if (existingVariant) {
        throw new BadRequestException('Variant name must be unique');
      }

      return await this.prisma.variant.create({
        data: {
          name: createVariantDto.name,
          price: createVariantDto.price,
        },
      });
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create variant',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll() {
    return await this.prisma.variant.findMany({});
  }

  async findOne(
    idOrNames: string | string[],
  ): Promise<VariantModel | VariantModel[] | null> {
    if (typeof idOrNames === 'string') {
      return isUUID(idOrNames)
        ? await this.prisma.variant.findUnique({ where: { id: idOrNames } })
        : await this.prisma.variant.findMany({
            where: { name: { contains: idOrNames, mode: 'insensitive' } },
          });
    }

    return await this.prisma.variant.findMany({
      where: {
        name: { in: idOrNames, mode: 'insensitive' },
      },
    });
  }

  async update(
    id: string,
    updateVariantDto: UpdateVariantDto,
  ): Promise<VariantModel> {
    try {
      const existingVariant = await this.prisma.variant.findUnique({
        where: { id },
      });

      if (!existingVariant) {
        throw new NotFoundException('Variant not found');
      }

      if (updateVariantDto.name) {
        const duplicateVariant = await this.prisma.variant.findFirst({
          where: { name: updateVariantDto.name, NOT: { id } },
        });

        if (duplicateVariant) {
          throw new BadRequestException('Variant name must be unique');
        }
      }

      return await this.prisma.variant.update({
        where: { id },
        data: { ...UpdateVariantDto },
      });
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to Update Variant',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      const existingVariant = await this.prisma.variant.findUnique({
        where: { id },
      });

      if (!existingVariant) {
        throw new NotFoundException('variant not found');
      }

      await this.prisma.variant.delete({ where: { id } });
      return true;
    } catch (error) {
      throw new HttpException(
        'Failed to delete variant',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
