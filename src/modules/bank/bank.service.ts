import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AttachUserBankDto, CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto, UpdateUserBankDto } from './dto/update-bank.dto';

@Injectable()
export class BankService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBankDto) {
    return this.prisma.banks.create({
      data: {
        name: dto.name,
      },
    });
  }

  async findAll() {
    return this.prisma.banks.findMany();
  }

  async findOne(id: string) {
    const bank = await this.prisma.users_has_banks.findUnique({
      where: { id },
    });

    if (!bank) throw new NotFoundException('Bank not found');
    return bank;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.banks.delete({ where: { id } });
  }

  async getUserBanks(ownerId: number) {
    const rawBanks = await this.prisma.users_has_banks.findMany({
      where: { users_id: ownerId },
    });

    return rawBanks.map((b) => ({
      id: b.id,
      bankName: b?.bank_name,
      accountNumber: b.account_number,
      accountName: b.account_name,
    }));
  }

  async attachBankToUser(ownerId: number, dto: AttachUserBankDto) {
    return await this.prisma.users_has_banks.create({
      data: {
        users_id: ownerId,
        bank_name: dto.bankName,
        account_number: dto.accountNumber,
        account_name: dto.accountName,
      },
    });
  }

  async updateUserBank(
    userBankId: string,
    ownerId: number,
    dto: UpdateUserBankDto,
  ) {
    const existing = await this.prisma.users_has_banks.findUnique({
      where: { id: userBankId },
    });

    if (!existing || existing.users_id !== ownerId) {
      throw new Error('Unauthorized or record not found');
    }

    return await this.prisma.users_has_banks.update({
      where: { id: userBankId },
      data: {
        bank_name: dto.bankName ?? existing.bank_name,
        account_number: dto.accountNumber ?? existing.account_number,
        account_name: dto.accountName ?? existing.account_name,
      },
    });
  }
}
