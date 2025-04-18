import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { tables as TableModel } from '.prisma/client';
import { validate as isUUID } from 'uuid';

@Injectable()
export class TableService {
  constructor(private prisma: PrismaService) {}

  async create(createTableDto: CreateTableDto): Promise<TableModel> {
    return await this.prisma.tables.create({
      data: {
        table_code: createTableDto.table_code,
        capacity: createTableDto.capacity,
        floor_id: createTableDto.floor_id,
      },
    });
  }

  async findAll(): Promise<TableModel[]> {
    return await this.prisma.tables.findMany();
  }

  async findOne(idOrCode: string): Promise<TableModel | null> {
    if (isUUID(idOrCode)) {
      return await this.prisma.tables.findUnique({
        where: { id: idOrCode },
      });
    }

    return await this.prisma.tables.findFirst({
      where: {
        table_code: {
          contains: idOrCode,
          mode: 'insensitive',
        },
      },
    });
  }

  async findMany(idOrCode: string): Promise<TableModel[] | TableModel | null> {
    if (isUUID(idOrCode)) {
      return await this.prisma.tables.findUnique({
        where: {
          id: idOrCode,
        },
      });
    }

    return await this.prisma.tables.findMany({
      where: {
        table_code: {
          contains: idOrCode,
          mode: 'insensitive',
        },
      },
    });
  }

  async update(id: string, dto: UpdateTableDto): Promise<TableModel> {
    const table = await this.prisma.tables.findUnique({
      where: { id },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return await this.prisma.tables.update({
      where: { id },
      data: {
        table_code: dto.table_code,
        capacity: dto.capacity,
        floor_id: dto.floor_id,
      },
    });
  }

  async remove(id: string): Promise<void> {
    const table = await this.prisma.tables.findUnique({
      where: { id },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    await this.prisma.tables.delete({
      where: { id },
    });
  }
}
