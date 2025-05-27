import { DateTime } from 'luxon';

export function formatTime(time: string | undefined): string {
  const today = new Date().toISOString().split('T')[0]; // Ambil tanggal hari ini
  return new Date(`${today}T${time}Z`).toISOString();
}

export function convertFromUnixTimestamp(unixTimestamp: number): string {
  return DateTime.fromSeconds(unixTimestamp)
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
