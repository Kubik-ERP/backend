import { BadRequestException, Injectable } from '@nestjs/common';
import {
  getEndOfDay,
  getStartOfDay,
  jakartaTime,
} from 'src/common/helpers/common.helpers';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { CashDrawerQueryDto } from '../dtos/cash-drawer.dto';

@Injectable()
export class CashDrawerService {
  constructor(private readonly prisma: PrismaService) {}

  async openCashDrawer(
    userId: number,
    staffId: string,
    balance: number,
    storeId: string,
    notes?: string,
  ) {
    // Validate input parameters
    const isOpen = await this.getCashDrawerStatus(storeId);
    if (isOpen && isOpen.status === 'open') {
      throw new BadRequestException('Cash drawer is already open for today.');
    }
    // Logic to open the cash drawer
    const cashDrawer = await this.prisma.cash_drawers.create({
      data: {
        id: uuidv4(), // Generate a unique ID for the cash drawer
        status: 'open',
        notes: notes || '',
        expected_balance: balance,
        created_by: userId,
        staff_id: staffId || null,
        created_at: jakartaTime().toUnixInteger(),
        store_id: storeId,
      },
    });

    return cashDrawer;
  }

  async closeCashDrawer(
    cashDrawerId: string,
    userId: number,
    actualBalance: number,
  ) {
    // Logic to close the cash drawer
    const cashDrawer = await this.prisma.cash_drawers.update({
      where: { id: cashDrawerId },
      data: {
        actual_balance: actualBalance,
        status: 'close',
        updated_by: userId,
        updated_at: jakartaTime().toUnixInteger(),
      },
    });
    return cashDrawer;
  }

  async getCashDrawerStatus(storeId: string) {
    // Logic to get the status of the cash drawer
    const cashDrawer = await this.prisma.cash_drawers.findFirst({
      where: {
        store_id: storeId, // Optional store ID
        created_at: {
          gte: jakartaTime().startOf('day').toUnixInteger(), // Greater than or equal to (Lebih besar atau sama dengan)
          lte: jakartaTime().endOf('day').toUnixInteger(), // Less than or equal to (Lebih kecil atau sama dengan)
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
    return cashDrawer;
  }

  async getCashDrawerLists(storeId: string, query: CashDrawerQueryDto) {
    // Logic to get the status of the cash drawer
    const startDate = query.startDate
      ? getStartOfDay(query.startDate)
      : undefined;

    const endDate = query.endDate ? getEndOfDay(query.endDate) : undefined;

    const limit = query.limit ? parseInt(query.limit.toString(), 10) : 10;
    const page = query.page ? parseInt(query.page.toString(), 10) : 1;

    const where: any = {
      store_id: storeId,
    };

    if (startDate && endDate) {
      where.created_at = {
        gte: startDate,
        lte: endDate,
      };
    }

    const [cashDrawer, count] = await Promise.all([
      this.prisma.cash_drawers.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.cash_drawers.count({ where }),
    ]);

    return [cashDrawer, count];
  }

  async editCashDrawer(cashDrawerId: string, userId: number, balance: number) {
    // Logic to edit the cash drawer details
    return await this.prisma.cash_drawers.update({
      where: { id: cashDrawerId },
      data: {
        expected_balance: balance,
        updated_by: userId,
        updated_at: jakartaTime().toUnixInteger(),
      },
    });
  }

  async addCashDrawerTransaction(
    cashDrawerId: string | undefined,
    amountIn: number,
    amountOut: number,
    type: number,
    notes: string | undefined = '',
    userId: number = 0,
  ) {
    // Logic to add a cash drawer transaction
    if (amountIn < 0 || amountOut < 0) {
      throw new BadRequestException('Amount in and out must be non-negative.');
    }

    const cashDrawer = await this.prisma.cash_drawers.findUnique({
      where: { id: cashDrawerId },
    });

    if (!cashDrawer) {
      throw new BadRequestException('Cash drawer not found.');
    }

    if (cashDrawer.status !== 'open') {
      throw new BadRequestException('Cash drawer is not open.');
    }

    if (type < 0 || type > 5) {
      throw new BadRequestException('Invalid transaction type.');
    }

    if (amountIn <= 0 && amountOut <= 0) {
      throw new BadRequestException(
        'At least one of amount in or amount out must be greater than zero.',
      );
    }

    const updatedBalance =
      (cashDrawer.actual_balance || 0) + amountIn - amountOut;

    await this.prisma.$transaction(async (prisma) => {
      await prisma.cash_drawers.update({
        where: { id: cashDrawer.id },
        data: {
          expected_balance: updatedBalance,
          updated_by: userId,
          updated_at: jakartaTime().toUnixInteger(),
        },
      });

      await prisma.cash_drawer_transactions.create({
        data: {
          id: uuidv4(),
          cash_drawers_id: cashDrawer.id,
          type: type,
          amount_in: amountIn,
          amount_out: amountOut,
          final_amount: updatedBalance,
          created_by: userId,
          created_at: jakartaTime().toUnixInteger(),
        },
      });
    });
  }

  async getCashDrawerTransactions(
    cashDrawerId: string,
    query: CashDrawerQueryDto,
  ) {
    // Logic to get the transactions of the cash drawer
    const startDate = query.startDate
      ? getStartOfDay(query.startDate)
      : undefined;

    const endDate = query.endDate ? getEndOfDay(query.endDate) : undefined;

    const limit = query.limit ? parseInt(query.limit.toString(), 10) : 10;
    const page = query.page ? parseInt(query.page.toString(), 10) : 1;

    const where: any = {
      cash_drawers_id: cashDrawerId,
    };

    if (startDate && endDate) {
      where.created_at = {
        gte: startDate,
        lte: endDate,
      };
    }

    const [transactions, count] = await Promise.all([
      this.prisma.cash_drawer_transactions.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.cash_drawer_transactions.count({ where }),
    ]);

    return [transactions, count];
  }
}
