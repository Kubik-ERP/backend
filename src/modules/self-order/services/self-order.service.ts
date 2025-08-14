import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CustomerService } from '../../customer/customer.service';
import { CreateCustomerDto } from '../../customer/dto/create-customer.dto';
import { toCamelCase } from '../../../common/helpers/object-transformer.helper';

@Injectable()
export class SelfOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customersService: CustomerService,
  ) {}

  // Sign in by code and number
  async signIn(params: { code?: string; number?: string }) {
    const code = params.code?.trim();
    const number = params.number?.trim();
    if (!number) throw new BadRequestException('number is required');

    const customer = await this.prisma.customer.findFirst({
      where: {
        number,
        ...(code ? { code } : {}),
      },
      include: {
        customers_has_tag: { include: { tag: true } },
        trn_customer_points: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const latestVisit = await this.prisma.invoice.findFirst({
      where: { customer_id: customer.id },
      orderBy: { created_at: 'desc' },
      select: { created_at: true },
    });

    return {
      id: customer.id,
      name: customer.name,
      code: customer.code ?? undefined,
      number: customer.number ?? undefined,
      dob: customer.dob ? customer.dob.toISOString() : undefined,
      email: customer.email ?? undefined,
      username: customer.username ?? undefined,
      address: customer.address ?? undefined,
      point:
        customer.trn_customer_points?.reduce(
          (acc: number, p: { type?: unknown; value: number }) =>
            acc +
            (p.type?.toString() === 'point_deduction' ? -p.value : p.value),
          0,
        ) ?? 0,
      latestVisit: latestVisit?.created_at?.toISOString() ?? undefined,
      customersHasTag: customer.customers_has_tag.map((cht: any) => ({
        customer_id: cht.customer_id,
        tag_id: cht.tag_id,
        tag: cht.tag,
      })),
    };
  }

  // Sign up: reuse existing customersService.create implementation
  async signUp(
    createCustomerDto: CreateCustomerDto,
    header: ICustomRequestHeaders,
  ) {
    if (!createCustomerDto?.name?.trim()) {
      throw new BadRequestException('name is required');
    }

    const created = await this.customersService.create(
      {
        name: createCustomerDto.name,
        code: createCustomerDto.code,
        number: createCustomerDto.number,
      } as CreateCustomerDto,
      header,
    );

    return {
      statusCode: 201,
      message: 'Customer created successfully',
      result: toCamelCase(created),
    };
  }
}
