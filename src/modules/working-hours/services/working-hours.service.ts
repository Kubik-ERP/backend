// src/working-hours/working-hours.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateWorkingHoursDto,
  WorkingHoursListDto,
} from '../dtos/working-hours.dto';
import {
  getOffset,
  getTotalPages,
} from 'src/common/helpers/pagination.helpers';

@Injectable()
export class WorkingHoursService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkingHoursDto) {
    const staffId = await this.resolveStaffId(dto.staffId);
    const result = await this.prisma.working_hours.create({
      data: {
        staff_id: staffId,
        date: new Date(dto.date),
        notes: dto.notes,
        repeat_type: dto.repeatType,
        working_hour_time_slots: {
          create: dto.timeSlots.map((slot) => ({
            open_time: slot.openTime ? `1970-01-01T${slot.openTime}:00Z` : null,
            close_time: slot.closeTime
              ? `1970-01-01T${slot.closeTime}:00Z`
              : null,
          })),
        },
        working_hour_recurrence: dto.customRecurrence
          ? {
              create: {
                frequency: dto.customRecurrence.frequency,
                interval: dto.customRecurrence.interval,
                end_type: dto.customRecurrence.endType,
                end_date: dto.customRecurrence.endDate
                  ? new Date(dto.customRecurrence.endDate)
                  : null,
                occurrences: dto.customRecurrence.occurrences,
              },
            }
          : undefined,
      },
      include: { working_hour_time_slots: true, working_hour_recurrence: true },
    });

    return result;
  }

  async findAll(query: WorkingHoursListDto) {
    const { page, pageSize } = query;

    const [items, total] = await Promise.all([
      this.prisma.working_hours.findMany({
        include: {
          working_hour_time_slots: true,
          working_hour_recurrence: true,
          employees: true,
        },
        orderBy: { created_at: 'desc' },
        skip: getOffset(page, pageSize),
        take: pageSize,
      }),
      this.prisma.working_hours.count(),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: getTotalPages(total, pageSize),
      },
    };
  }

  async findByStaffId(staffId: string) {
    const resolvedStaffId = await this.resolveStaffId(staffId);
    if (!resolvedStaffId) {
      throw new NotFoundException('Staff tidak ditemukan');
    }

    const items = await this.prisma.working_hours.findMany({
      where: { staff_id: resolvedStaffId },
      include: {
        working_hour_time_slots: true,
        working_hour_recurrence: true,
        employees: true,
      },
      orderBy: { date: 'asc' },
    });

    return items;
  }

  async findOne(id: number) {
    const result = await this.prisma.working_hours.findUnique({
      where: { id },
      include: { working_hour_time_slots: true, working_hour_recurrence: true },
    });
    if (!result) throw new NotFoundException(`Working hours #${id} not found`);
    return result;
  }

  async update(id: number, dto: CreateWorkingHoursDto) {
    await this.findOne(id);

    const staffId = await this.resolveStaffId(dto.staffId);
    const result = await this.prisma.working_hours.update({
      where: { id },
      data: {
        staff_id: staffId,
        date: new Date(dto.date),
        notes: dto.notes,
        repeat_type: dto.repeatType,
        working_hour_time_slots: {
          deleteMany: {},
          create: dto.timeSlots.map((slot) => ({
            open_time: slot.openTime ? `1970-01-01T${slot.openTime}:00Z` : null,
            close_time: slot.closeTime
              ? `1970-01-01T${slot.closeTime}:00Z`
              : null,
          })),
        },
        working_hour_recurrence: dto.customRecurrence
          ? {
              upsert: {
                update: {
                  frequency: dto.customRecurrence.frequency,
                  interval: dto.customRecurrence.interval,
                  end_type: dto.customRecurrence.endType,
                  end_date: dto.customRecurrence.endDate
                    ? new Date(dto.customRecurrence.endDate)
                    : null,
                  occurrences: dto.customRecurrence.occurrences,
                },
                create: {
                  frequency: dto.customRecurrence.frequency,
                  interval: dto.customRecurrence.interval,
                  end_type: dto.customRecurrence.endType,
                  end_date: dto.customRecurrence.endDate
                    ? new Date(dto.customRecurrence.endDate)
                    : null,
                  occurrences: dto.customRecurrence.occurrences,
                },
              },
            }
          : { delete: true },
      },
      include: { working_hour_time_slots: true, working_hour_recurrence: true },
    });

    return result;
  }

  async remove(id: number) {
    await this.findOne(id);
    const result = await this.prisma.working_hours.delete({
      where: { id },
      include: { working_hour_time_slots: true, working_hour_recurrence: true },
    });
    return result;
  }

  private async resolveStaffId(staffId?: string | null) {
    if (!staffId) {
      return null;
    }

    const staff = await this.prisma.employees.findUnique({
      where: { id: staffId },
      select: { id: true },
    });

    if (!staff) {
      throw new NotFoundException('Staff tidak ditemukan');
    }

    return staff.id;
  }
}
