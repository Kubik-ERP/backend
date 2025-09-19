import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateIntegrationDto } from './dto/update-integration.dto';

@Injectable()
export class IntegrationsService {
  constructor(private readonly prismaService: PrismaService) {}
  async findAll(req: ICustomRequestHeaders) {
    const storeId = req.store_id;
    try {
      return await this.prismaService.integrations.findFirst({
        where: { stores_id: storeId },
      });
    } catch (error) {
      throw new Error(`Failed to retrieve integrations: ${error.message}`);
    }
  }

  async update(
    id: string,
    updateIntegrationDto: UpdateIntegrationDto,
    req: ICustomRequestHeaders,
  ) {
    const storeId = req.store_id;
    const { image, isStatic } = updateIntegrationDto;
    if (isStatic && !image) {
      throw new BadRequestException('Static integrations must have an image');
    }
    try {
      return await this.prismaService.integrations.upsert({
        where: { id },
        create: {
          is_static: isStatic,
          image: image,
          stores_id: storeId || '',
        },
        update: {
          is_static: isStatic,
          image: image,
        },
      });
    } catch (error) {
      throw new Error(`Failed to update integration: ${error.message}`);
    }
  }
}
