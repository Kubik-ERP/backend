import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { isUUID } from 'class-validator';

@Injectable()
export class ShiftService {
  constructor(private prisma: PrismaService) {}

  async create(createShiftDto: CreateShiftDto) {
    try {
      const conflict = await this.prisma.employees_shift.findFirst({
        where: {
          start_time: createShiftDto.start_time,
          end_time: createShiftDto.end_time,
          days: createShiftDto.days,
          employees_id: createShiftDto.employees_id,
        },
      });

      if (conflict) {
        throw new BadRequestException(
          'Shift already exists for this employee and time',
        );
      }

      return await this.prisma.employees_shift.create({
        data: createShiftDto,
      });
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create shift',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  findAll() {
    return this.prisma.employees_shift.findMany();
  }

  async findOne(id: string) {
    try {
      if (isUUID(id)) {
        return await this.prisma.employees_shift.findFirst({
          where: { id },
        });
      }
    } catch (error) {
      throw new HttpException(
        'Failed to fetch shift',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(id: string, updateShiftDto: UpdateShiftDto) {
    try {
      const existingShift = await this.prisma.employees_shift.findFirst({
        where: { id },
      });

      if (!existingShift) {
        throw new NotFoundException('Shift not found');
      }

      return await this.prisma.employees_shift.update({
        where: {
          id_employees_id: {
            id: existingShift.id,
            employees_id: existingShift.employees_id,
          },
        },
        data: updateShiftDto,
      });
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update shift',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string) {
    try {
      const existingShift = await this.prisma.employees_shift.findFirst({
        where: { id },
      });

      if (!existingShift) {
        throw new NotFoundException('Shift not found');
      }

      await this.prisma.employees_shift.delete({
        where: {
          id_employees_id: {
            id: existingShift.id,
            employees_id: existingShift.employees_id,
          },
        },
      });
      return true;
    } catch (error) {
      throw new HttpException(
        'Failed to delete shift',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
