import { BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';

export function formatTime(time: string | undefined): string {
  const today = new Date().toISOString().split('T')[0]; // Ambil tanggal hari ini
  return new Date(`${today}T${time}Z`).toISOString();
}

export function convertFromUnixTimestamp(
  unixTimestamp: number | bigint,
): string {
  return DateTime.fromSeconds(Number(unixTimestamp))
    .setZone('Asia/Jakarta')
    .toFormat('yyyy-MM-dd HH:mm:ss');
}

export const formatDate = (date: Date): string => {
  return DateTime.fromJSDate(date)
    .setZone('Asia/Jakarta')
    .toFormat('yyyy-MM-dd HH:mm:ss');
};

export const jakartaTime = (): DateTime => {
  return DateTime.now().setZone('Asia/Jakarta');
};

export const getStartOfDay = (date?: string): number => {
  const dt = DateTime.fromFormat(date!, 'dd-MM-yyyy', { zone: 'Asia/Jakarta' });
  if (!dt.isValid) {
    throw new Error('Invalid date format, expected DD-MM-YYYY');
  }
  return dt.startOf('day').toUnixInteger();
};

export const getEndOfDay = (date: string): number => {
  const dt = DateTime.fromFormat(date, 'dd-MM-yyyy', { zone: 'Asia/Jakarta' });
  if (!dt.isValid) {
    throw new Error('Invalid date format, expected DD-MM-YYYY');
  }
  return dt.endOf('day').toUnixInteger(); // Unix timestamp dalam milidetik
};

export const formatDateCommon = (date: Date): string => {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Convert string "dd-MM-yyyy" → "yyyy-MM-dd"
 *
 * NOTE:
 * - Tidak perlu pakai timezone karena kolom di DB bertipe DATE (tanpa jam).
 * - DATE hanya simpan informasi tahun, bulan, hari → tidak ada jam/offset.
 * - Jadi tidak ada risiko "geser hari" akibat perbedaan timezone server vs lokal.
 */
export function convertToIsoDate(input: string): string {
  const dt = DateTime.fromFormat(input, 'dd-MM-yyyy');
  if (!dt.isValid) {
    throw new Error('Invalid date format, expected dd-MM-yyyy');
  }
  return dt.toFormat('yyyy-MM-dd');
}

export const percentageToAmount = (percentage: number, total: number) => {
  return total * (percentage / 100);
};

/**
 * Generate next id
 *
 * @example
 * generateNextId('PO', 1, 3) // PO-002
 * generateNextId('PO', 10) // PO-011
 * generateNextId('PO', 100, 4) // PO-0101
 */
export const generateNextId = (
  prefix: string,
  latestNumber: number,
  padding: number = 3,
): string => {
  return `${prefix}-${(latestNumber + 1).toString().padStart(padding, '0')}`;
};

/**
 * Convert id to number
 *
 * @example
 * idToNumber('PO-001') // 1
 * idToNumber('PO-010') // 10
 * idToNumber('PO-100') // 100
 * idToNumber('STK-20250820-007') // 7
 * idToNumber('INV-2025-12-00045') // 45
 */
export const idToNumber = (id: string): number => {
  const parts = id.split('-');
  const lastPart = parts[parts.length - 1]; // always take the last segment
  return /^\d+$/.test(lastPart) ? parseInt(lastPart, 10) : NaN;
};

/**
 * Require user from header
 *
 * @param header
 * @returns user
 * @throws BadRequestException if user is not found
 */
export const requireUser = (header: ICustomRequestHeaders) => {
  const user = header?.user;
  if (!user) throw new BadRequestException('user is required');
  return user;
};

/**
 * Require store id from header
 *
 * @param header
 * @returns store_id
 * @throws BadRequestException if store_id is not found
 */
export const requireStoreId = (header: ICustomRequestHeaders): string => {
  const store_id = header?.store_id;
  if (!store_id) throw new BadRequestException('store_id is required');
  return store_id;
};

export const randomBase16 = (length: number): string => {
  const array = new Uint8Array(length / 2); // 2 hex chars = 1 byte
  crypto.getRandomValues(array); // works in Browser/Deno

  return Array.from(array, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
    .slice(0, length);
};
