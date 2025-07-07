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
