import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CustomerService } from '../../customer/customer.service';
import { CreateCustomerDto } from '../../customer/dto/create-customer.dto';
import { SelfOrderSignUpDto } from '../dtos/self-order-signup.dto';

@Injectable()
export class SelfOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customersService: CustomerService,
  ) {}

  // Sign up (Self-Order):
  // 1) If phone (code+number) exists and linked to store -> return existing
  // 2) Else create a new customer and store link using customersService.create
  async signUp(dto: SelfOrderSignUpDto, header: ICustomRequestHeaders) {
    if (!dto?.name?.trim()) {
      throw new BadRequestException('name is required');
    }
    if (!dto?.storeId?.trim()) {
      throw new BadRequestException('storeId is required');
    }

    const existing = await this.prisma.customer.findFirst({
      where: {
        number: dto.number ?? undefined,
        ...(dto.code ? { code: dto.code } : {}),
        customer_has_stores: {
          some: { stores: { id: dto.storeId } },
        },
      },
      include: {
        customers_has_tag: { include: { tag: true } },
        customer_has_stores: { include: { stores: true } },
      },
    });

    if (existing) {
      return { customer: existing, created: false } as const;
    }

    header.store_id = dto.storeId;
    const created = await this.customersService.create(
      {
        name: dto.name,
        email: dto.email,
        code: dto.code,
        number: dto.number,
      } as CreateCustomerDto,
      header,
    );

    return { customer: created, created: true } as const;
  }

  async storePermission(storeId: string) {
    // Get store's owner
    const owner = await this.prisma.users.findFirst({
      select: {
        id: true,
      },
      where: {
        user_has_stores: {
          some: {
            store_id: storeId,
          },
        },
      },
    });

    if (!owner) {
      throw new BadRequestException('Owner not found');
    }

    const storeHasSelfOrderPermission =
      await this.prisma.sub_package_access.findFirst({
        where: {
          permissions: {
            key: 'self_order',
          },
          subs_package: {
            users: {
              some: {
                id: owner.id,
              },
            },
          },
        },
      });

    if (!storeHasSelfOrderPermission) {
      throw new ForbiddenException(
        `Access denied. Required permissions (at least one): self_order`,
      );
    }

    return true;
  }
}
