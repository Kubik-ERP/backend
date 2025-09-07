import { VoucherStatus } from './interfaces/vouchers.interface';

interface VoucherWithPeriod {
  start_period: Date;
  end_period: Date;
}

export function getStatus(voucher: VoucherWithPeriod): VoucherStatus {
  // set hour, minute, second to 0
  const start_period = new Date(voucher.start_period);
  start_period.setHours(0, 0, 0, 0);

  const end_period = new Date(voucher.end_period);
  end_period.setHours(0, 0, 0, 0);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (voucher.start_period && voucher.end_period) {
    if (now < start_period) return 'upcoming';
    if (now >= start_period && now <= end_period) return 'active';
  }
  return 'expired';
}

export function isVoucherActive(voucher: VoucherWithPeriod): boolean {
  const start_period = new Date(voucher.start_period);
  start_period.setHours(0, 0, 0, 0);

  const end_period = new Date(voucher.end_period);
  end_period.setHours(0, 0, 0, 0);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return now >= start_period && now <= end_period;
}
