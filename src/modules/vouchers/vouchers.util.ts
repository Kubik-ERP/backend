import { VoucherStatus } from './interfaces/vouchers.interface';

interface VoucherWithPeriod {
  start_period: Date;
  end_period: Date;
}

export function getStatus(voucher: VoucherWithPeriod): VoucherStatus {
  const now = new Date();
  if (voucher.start_period && voucher.end_period) {
    if (now < voucher.start_period) return 'upcoming';
    if (now >= voucher.start_period && now <= voucher.end_period)
      return 'active';
  }
  return 'expired';
}
