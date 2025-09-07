import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TagService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTagDto: CreateTagDto) {
    return await this.prisma.tag.create({
      data: {
        name: createTagDto.name,
      },
    });
  }

  async findAll() {
    return await this.prisma.tag.findMany();
  }

  async findOne(id: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    return tag;
  }

  async update(id: string, updateTagDto: UpdateTagDto) {
    const existingTag = await this.prisma.tag.findUnique({
      where: { id },
    });

    if (!existingTag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    return await this.prisma.tag.update({
      where: { id },
      data: {
        name: updateTagDto.name,
      },
    });
  }

  async remove(id: string) {
    const existingTag = await this.prisma.tag.findUnique({ where: { id } });
    if (!existingTag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    await this.prisma.tag.delete({ where: { id } });

    return { message: 'Tag deleted successfully' };
  }
}
