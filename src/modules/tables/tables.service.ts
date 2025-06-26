import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { tables as TableModel, Prisma } from '@prisma/client';
import { toCamelCase } from '../../common/helpers/object-transformer.helper';

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  async create(createTableDto: CreateTableDto): Promise<TableModel> {
    const { table_code } = createTableDto;

    const existing = await this.prisma.tables.findFirst({
      where: { table_code },
    });

    if (existing) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Table code must be unique',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.prisma.tables.create({
      data: createTableDto as Prisma.tablesUncheckedCreateInput,
    });
  }
  async findAll(): Promise<TableModel[]> {
    return this.prisma.tables.findMany({
      include: {
        stores: true,
      },
    });
  }


  async findOne(id: string): Promise<TableModel> {
    const table = await this.prisma.tables.findUnique({
      where: { id },
      include: { stores: true },
    });

    if (!table) {
      throw new NotFoundException(`Table with id ${id} not found`);
    }

    return table;
  }

  async update(
    id: string,
    updateTableDto: UpdateTableDto,
  ): Promise<TableModel> {
    const existing = await this.prisma.tables.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Table not found');
    }

    if (updateTableDto.table_code) {
      const duplicate = await this.prisma.tables.findFirst({
        where: {
          table_code: updateTableDto.table_code,
          NOT: { id },
        },
      });

      if (duplicate) {
        throw new BadRequestException('Table code must be unique');
      }
    }

    return this.prisma.tables.update({
      where: { id },
      data: updateTableDto,
    });
  }

  async remove(id: string): Promise<boolean> {
    const existing = await this.prisma.tables.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Table not found');
    }

    await this.prisma.tables.delete({
      where: { id },
    });

    return true;
  }

  async findByStoreId(
    store_id: string,
    floor_number: number,
  ): Promise<TableModel[]> {
    return this.prisma.tables.findMany({
      where: {
        store_id,
        floor_number,
      },
      include: {
        stores: true,
      },
    });
  }
}
