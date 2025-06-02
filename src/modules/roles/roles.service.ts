import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async create(createRoleDto: CreateRoleDto) {
    const { name } = createRoleDto;

    const existingRole = await this.prisma.roles.findFirst({ where: { name } });
    if (existingRole) {
      throw new ConflictException(`Role with name "${name}" already exists.`);
    }

    return this.prisma.roles.create({
      data: {
        name,
      },
    });
  }

  async findAll() {
    return this.prisma.roles.findMany();
  }

  async findOne(id: string) {
    const role = await this.prisma.roles.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found.`);
    }
    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.prisma.roles.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found.`);
    }

    if (updateRoleDto.name) {
      const existingRole = await this.prisma.roles.findFirst({
        where: { name: updateRoleDto.name, NOT: { id } },
      });
      if (existingRole) {
        throw new ConflictException(
          `Role with name "${updateRoleDto.name}" already exists.`,
        );
      }
    }

    return this.prisma.roles.update({
      where: { id },
      data: updateRoleDto,
    });
  }

  async remove(id: string) {
    const role = await this.prisma.roles.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found.`);
    }

    return this.prisma.roles.delete({ where: { id } });
  }
}
