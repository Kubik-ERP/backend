// src/working-hours/working-hours.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWorkingHoursDto } from '../dtos/working-hours.dto';

@Injectable()
export class WorkingHoursService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkingHoursDto) {
    const result = await this.prisma.working_hours.create({
      data: {
        staff_id: dto.staffId,
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

  async findAll() {
    const result = await this.prisma.working_hours.findMany({
      include: { working_hour_time_slots: true, working_hour_recurrence: true },
      orderBy: { created_at: 'desc' },
    });
    return result;
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

    const result = await this.prisma.working_hours.update({
      where: { id },
      data: {
        staff_id: dto.staffId,
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
}
