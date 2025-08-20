import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { QueryFacility } from './dto/query-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';

@Injectable()
export class FacilitiesService {
  constructor(private readonly prisma: PrismaService) {}
  async create(
    createFacilityDto: CreateFacilityDto,
    header: ICustomRequestHeaders,
  ) {
    const { store_id } = header;
    const { facility, description } = createFacilityDto;
    if (!store_id) {
      throw new BadRequestException('Store ID is required');
    }
    const newFacility = await this.prisma.store_facilities.create({
      data: {
        facility,
        description,
        stores: {
          connect: { id: store_id },
        },
      },
    });
    return newFacility;
  }

  async findAll(query: QueryFacility, id: ICustomRequestHeaders) {
    const { store_id } = id;
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const [totalItems, storeFacilityItems] = await this.prisma.$transaction([
      this.prisma.store_facilities.count({
        where: { store_id: store_id },
      }),
      this.prisma.store_facilities.findMany({
        where: { store_id: store_id },
        skip: skip,
        take: limit,
      }),
    ]);
    const totalPages = Math.ceil(totalItems / limit);
    return {
      data: storeFacilityItems,
      meta: {
        page,
        pageSize: limit,
        total: totalItems,
        totalPages,
      },
    };
  }

  async findOne(id: number) {
    return `This action returns a #${id} facility`;
  }

  async update(id: string, updateFacilityDto: UpdateFacilityDto) {
    const { facility, description } = updateFacilityDto;
    const existingFacility = await this.prisma.store_facilities.findUnique({
      where: { id },
    });
    if (!existingFacility) {
      throw new BadRequestException('Facility not found');
    }
    return this.prisma.store_facilities.update({
      where: { id },
      data: {
        facility,
        description,
      },
    });
  }

  async remove(id: string) {
    const existingFacility = await this.prisma.store_facilities.findUnique({
      where: { id },
    });
    if (!existingFacility) {
      throw new BadRequestException('Facility not found');
    }
    return this.prisma.store_facilities.delete({
      where: { id },
    });
  }
}
