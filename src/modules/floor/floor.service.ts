import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { floor as FloorModel } from '.prisma/client';
import { validate as isUUID } from 'uuid';

@Injectable()
export class FloorService {
  constructor(private prisma: PrismaService) {}

  async create(createFloorDto: CreateFloorDto) {
    try {
      const newFloor = await this.prisma.floor.create({
        data: {
          floor_number: createFloorDto.floor_number,
        },
      });

      return newFloor;
    } catch (error) {
      throw new Error(error.message || 'Failed to create floor');
    }
  }

  public async findAll(): Promise<FloorModel[]> {
    const floor = await this.prisma.floor.findMany();
    return floor;
  }

  public async findOne(idOrcategory: string): Promise<FloorModel | null> {
    if (isUUID(idOrcategory)) {
      return await this.prisma.floor.findUnique({
        where: { id: idOrcategory },
      });
    } else {
      return await this.prisma.floor.findFirst({
        where: {
          floor_number: { contains: idOrcategory, mode: 'insensitive' },
        },
      });
    }
  }

  public async findMany(
    idOrcategory: string,
  ): Promise<FloorModel | FloorModel[] | null> {
    if (isUUID(idOrcategory)) {
      return await this.prisma.floor.findUnique({
        where: { id: idOrcategory },
      });
    } else {
      return await this.prisma.floor.findMany({
        where: {
          floor_number: { contains: idOrcategory, mode: 'insensitive' },
        },
      });
    }
  }

  async update(id: string, updateFloorDto: UpdateFloorDto) {
    try {
      const existingFloor = await this.prisma.floor.findUnique({
        where: { id },
      });

      if (!existingFloor) {
        throw new NotFoundException('Floor not found');
      }

      const updatedCategory = await this.prisma.floor.update({
        where: { id },
        data: {
          floor_number:
            updateFloorDto.floor_number || updateFloorDto.floor_number,
        },
      });

      return updatedCategory;
    } catch (error) {
      console.error('Error updating Floor:', error);
      throw new Error(error.message || 'Failed to update Floor');
    }
  }

  async remove(id: string) {
    try {
      const existingFloor = await this.prisma.floor.findUnique({
        where: { id },
      });

      if (!existingFloor) {
        throw new NotFoundException('Floor not found');
      }

      await this.prisma.floor.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      console.error('Error deleting Floor:', error);
      throw new Error('Failed to delete floor');
    }
  }
}
