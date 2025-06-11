import { BadRequestException, Injectable } from '@nestjs/common';
import { jakartaTime } from 'src/common/helpers/common.helpers';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CashDrawerService {
  constructor(private readonly prisma: PrismaService) {}

  async openCashDrawer(
    userId: number,
    balance: number,
    storeId: string,
    notes?: string,
  ) {
    // Validate input parameters
    const isOpen = await this.getCashDrawerStatus(storeId);
    if (!isOpen) {
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
}
