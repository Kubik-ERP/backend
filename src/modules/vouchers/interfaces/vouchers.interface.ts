import { voucher, voucher_status } from '@prisma/client';

export interface IVoucher extends voucher {
  status: voucher_status;
}

export type VoucherStatus = voucher_status;
