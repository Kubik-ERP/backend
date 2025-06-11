// DTOs
import { CreateUserDto } from '../dtos/create-user.dto';
import { ListOptionDto } from '../../../common/dtos/list-options.dto';
import { PaginateDto } from '../../../common/dtos/paginate.dto';
import { PageMetaDto } from '../../../common/dtos/page-meta.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import * as bcrypt from 'bcrypt';

// NestJS Libraries
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

// Prisma
import { PrismaService } from '../../../prisma/prisma.service';
import { users as UserModel } from '@prisma/client';
import { UUID } from 'crypto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @description Create a user
   */
  public async create(payload: CreateUserDto): Promise<UserModel> {
    try {
      // @ts-ignore
      return await this.prisma.users.create({
        data: {
          username: payload.username,
          email: payload.email,
          password: payload.password,
          fullname: payload.fullname,
        },
      });
    } catch (error) {
      console.log(error);
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

      const users = await this.prisma.users.findMany({
        where,
        skip: filters.skip,
        take: filters.limit,
        orderBy,
      });

      const totalData = await this.prisma.users.count({ where });

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
    const user = await this.prisma.users.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    return user;
  }

  /**
   * @description Find user by username
   */
  public async findOneByUsername(username: string): Promise<UserModel | null> {
    return this.prisma.users.findFirst({
      where: { username },
    });
  }

  /**
   * @description Find user by email
   */
  public async findOneByEmail(email: string): Promise<UserModel | null> {
    return this.prisma.users.findUnique({
      where: { email },
    });
  }

  /**
   * @description Update a user
   */
  public async update(id: number, payload: UpdateUserDto): Promise<UserModel> {
    try {
      return await this.prisma.users.update({
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
      const nowUnix = Math.floor(Date.now() / 1000);
      return await this.prisma.users.update({
        where: { id },
        data: { deleted_at: nowUnix },
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
      return await this.prisma.users.update({
        where: { id },
        data: { deleted_at: 0 },
      });
    } catch (error) {
      throw new BadRequestException('Failed to restore user', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description set or unset a pin
   */
  public async handlePin(id: number, pin?: string | null): Promise<boolean> {
    try {
      const hashPin = pin ? await bcrypt.hash(pin, 10) : null;
      await this.prisma.users.update({
        where: { id },
        data: {
          pin: hashPin,
        },
      });
      return true;
    } catch (error) {
      throw new BadRequestException('Failed to set/unset pin', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  public async getUserRole(userId: number): Promise<string | null> {
    try {
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        include: {
          roles: true,
        },
      });

      return user?.roles?.name || null;
    } catch (error) {
      throw new BadRequestException('Failed to fetch user role', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  public async getRoleIdByRoleName(name: string): Promise<string | null> {
    try {
      const ownerRole = await this.prisma.roles.findFirst({
        where: { name: name },
      });

      return ownerRole?.id || null;
    } catch (error) {
      throw new BadRequestException('Failed to fetch owner role ID', {
        cause: new Error(),
        description: error.message,
      });
    }
  }
}
