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
    const bank = await this.prisma.banks.findUnique({
      where: { id },
      include: {
        users_has_banks: true,
      },
    });

    if (!bank) throw new NotFoundException('Bank not found');
    return bank;
  }

  async update(id: string, dto: UpdateBankDto) {
    const bank = await this.findOne(id);
    return this.prisma.banks.update({
      where: { id },
      data: { name: dto.name ?? bank.name },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.banks.delete({ where: { id } });
  }

  async getUserBanks(userId: number) {
    return await this.prisma.users_has_banks.findMany({
      where: { users_id: userId },
      include: { banks: true },
    });
  }

  async attachBankToUser(userId: number, dto: AttachUserBankDto) {
    return await this.prisma.users_has_banks.create({
      data: {
        users_id: userId,
        bank_id: dto.bankId,
        account_number: dto.accountNumber,
        account_name: dto.accountName,
      },
      include: {
        banks: true,
      },
    });
  }

  async updateUserBank(
    userBankId: string,
    userId: number,
    dto: UpdateUserBankDto,
  ) {
    const existing = await this.prisma.users_has_banks.findUnique({
      where: { id: userBankId },
    });

    if (!existing || existing.users_id !== userId) {
      throw new Error('Unauthorized or record not found');
    }

    return await this.prisma.users_has_banks.update({
      where: { id: userBankId },
      data: {
        bank_id: dto.bankId ?? existing.bank_id,
        account_number: dto.accountNumber ?? existing.account_number,
        account_name: dto.accountName ?? existing.account_name,
      },
      include: { banks: true },
    });
  }
}
