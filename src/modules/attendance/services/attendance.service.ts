// src/attendance/attendance.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAttendanceDto } from '../dtos/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAttendanceDto) {
    const staff = await this.resolveStaff(dto.staffId);
    if (!staff) {
      throw new NotFoundException('Staff tidak ditemukan');
    }

    return this.prisma.attendance.create({
      data: {
        staff_id: staff!.id,
        date: new Date(dto.date),
        staff_name: dto.staffName ?? staff?.name ?? null,
        created_by: dto.createdBy,
        attendance_shifts: {
          create: dto.shifts.map((s) => this.mapShiftPayload(s)),
        },
      },
      include: { attendance_shifts: true },
    });
  }

  async findAll() {
    return this.prisma.attendance.findMany({
      include: { attendance_shifts: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number) {
    const data = await this.prisma.attendance.findUnique({
      where: { id },
      include: { attendance_shifts: true },
    });
    if (!data) throw new NotFoundException(`Attendance #${id} not found`);
    return data;
  }

  async update(id: number, dto: CreateAttendanceDto) {
    await this.findOne(id);
    const staff = await this.resolveStaff(dto.staffId);
    if (!staff) {
      throw new NotFoundException('Staff tidak ditemukan');
    }

    return this.prisma.attendance.update({
      where: { id },
      data: {
        staff_id: staff!.id,
        date: new Date(dto.date),
        staff_name: dto.staffName ?? staff?.name ?? null,
        created_by: dto.createdBy,
        attendance_shifts: {
          deleteMany: {},
          create: dto.shifts.map((s) => this.mapShiftPayload(s)),
        },
      },
      include: { attendance_shifts: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.attendance.delete({
      where: { id },
      include: { attendance_shifts: true },
    });
  }

  private async resolveStaff(staffId?: string | null) {
    if (!staffId) {
      return null;
    }

    const staff = await this.prisma.employees.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff tidak ditemukan');
    }

    return staff;
  }

  private mapShiftPayload(shift: CreateAttendanceDto['shifts'][number]) {
    return {
      shift_start: this.parseRequiredTime(shift.shiftStart, 'shiftStart'),
      shift_end: this.parseRequiredTime(shift.shiftEnd, 'shiftEnd'),
      clock_in: this.parseOptionalTime(shift.clockIn),
      clock_out: this.parseOptionalTime(shift.clockOut),
      duration: shift.duration,
      early: shift.early,
      late: shift.late,
      overtime: shift.overtime,
      notes: shift.notes,
    };
  }

  private parseRequiredTime(value: string, fieldName: string): Date {
    const parsed = this.timeToDate(value);
    if (!parsed) {
      throw new BadRequestException(`${fieldName} wajib diisi`);
    }
    return parsed;
  }

  private parseOptionalTime(value?: string | null): Date | null {
    return this.timeToDate(value);
  }

  private timeToDate(value?: string | null): Date | null {
    if (!value) return null;

    const match = value.trim().match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) {
      throw new BadRequestException(
        'Format waktu tidak valid, gunakan HH:mm atau HH:mm:ss',
      );
    }

    const [, hoursStr, minutesStr, secondsStr] = match;
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    const seconds = Number(secondsStr ?? '0');

    if (hours > 23 || minutes > 59 || seconds > 59) {
      throw new BadRequestException(
        'Format waktu tidak valid, gunakan HH:mm atau HH:mm:ss',
      );
    }

    return new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));
  }
}
