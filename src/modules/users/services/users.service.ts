// DTOs
import { CreateUserDto } from '../dtos/create-user.dto';
import { ListOptionDto } from '../../../common/dtos/list-options.dto';
import { PaginateDto } from '../../../common/dtos/paginate.dto';
import { PageMetaDto } from '../../../common/dtos/page-meta.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';

// NestJS Libraries
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

// Prisma
import { PrismaService } from '../../../prisma/prisma.service';
import { UserModel } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @description Create a user
   */
  public async create(payload: CreateUserDto): Promise<UserModel> {
    try {
      return await this.prisma.userModel.create({
        data: payload,
      });
    } catch (error) {
      throw new BadRequestException('Failed to create user', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Find all users
   */
  public async findAll(
    filters: ListOptionDto,
  ): Promise<PaginateDto<UserModel>> {
    try {
      const where: any = {};

      if (filters.search) {
        where.OR = [
          { username: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (!filters.isDeleted) {
        where.deletedAt = null;
      }

      const orderBy =
        Array.isArray(filters.sortBy) && filters.sortBy.length > 0
          ? filters.sortBy.reduce<Record<string, 'asc' | 'desc'>>(
              (acc, sortStr) => {
                const [field, order] = sortStr.split('|'); // Pisahkan "field|order"
                const normalizedOrder =
                  order?.toLowerCase() === 'desc' ? 'desc' : 'asc';
                if (field) {
                  acc[field] = normalizedOrder; // Simpan dalam objek Prisma
                }
                return acc;
              },
              {},
            )
          : undefined;

      const users = await this.prisma.userModel.findMany({
        where,
        skip: filters.skip,
        take: filters.limit,
        orderBy,
      });

      const totalData = await this.prisma.userModel.count({ where });

      const meta = new PageMetaDto({
        totalData,
        total: users.length,
        page: filters.offset,
        size: filters.limit,
        pageCount: Math.ceil(totalData / filters.limit),
      });

      return new PaginateDto<UserModel>(users, meta);
    } catch (error) {
      throw new BadRequestException('Failed to fetch users', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Find user by ID
   */
  public async findOneById(id: number): Promise<UserModel> {
    const user = await this.prisma.userModel.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    return user;
  }

  /**
   * @description Find user by username
   */
  public async findOneByUsername(username: string): Promise<UserModel | null> {
    return this.prisma.userModel.findUnique({
      where: { username },
    });
  }

  /**
   * @description Find user by email
   */
  public async findOneByEmail(email: string): Promise<UserModel | null> {
    return this.prisma.userModel.findUnique({
      where: { email },
    });
  }

  /**
   * @description Update a user
   */
  public async update(id: number, payload: UpdateUserDto): Promise<UserModel> {
    try {
      return await this.prisma.userModel.update({
        where: { id },
        data: payload,
      });
    } catch (error) {
      throw new BadRequestException('Failed to update user', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Soft delete a user
   */
  public async delete(id: number): Promise<UserModel> {
    try {
      return await this.prisma.userModel.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      throw new BadRequestException('Failed to delete user', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Restore a soft-deleted user
   */
  public async restore(id: number): Promise<UserModel> {
    try {
      return await this.prisma.userModel.update({
        where: { id },
        data: { deletedAt: null },
      });
    } catch (error) {
      throw new BadRequestException('Failed to restore user', {
        cause: new Error(),
        description: error.message,
      });
    }
  }
}
