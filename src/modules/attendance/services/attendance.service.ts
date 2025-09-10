// src/attendance/attendance.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAttendanceDto } from '../dtos/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAttendanceDto) {
    return this.prisma.attendance.create({
      data: {
        staff_id: dto.staffId,
        date: new Date(dto.date),
        staff_name: dto.staffName,
        created_by: dto.createdBy,
        attendance_shifts: {
          create: dto.shifts.map((s) => ({
            shift_start: s.shiftStart,
            shift_end: s.shiftEnd,
            clock_in: s.clockIn,
            clock_out: s.clockOut,
            duration: s.duration,
            early: s.early,
            late: s.late,
            overtime: s.overtime,
            notes: s.notes,
          })),
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

    return this.prisma.attendance.update({
      where: { id },
      data: {
        staff_id: dto.staffId,
        date: new Date(dto.date),
        staff_name: dto.staffName,
        created_by: dto.createdBy,
        attendance_shifts: {
          deleteMany: {},
          create: dto.shifts.map((s) => ({
            shift_start: s.shiftStart,
            shift_end: s.shiftEnd,
            clock_in: s.clockIn,
            clock_out: s.clockOut,
            duration: s.duration,
            early: s.early,
            late: s.late,
            overtime: s.overtime,
            notes: s.notes,
          })),
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
}
