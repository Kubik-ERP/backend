// src/working-hours/dto/create-working-hours.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class TimeSlotDto {
  @ApiProperty({ example: '07:00', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'openTime must be in HH:mm format',
  })
  openTime: string | null;

  @ApiProperty({ example: '12:00', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'closeTime must be in HH:mm format',
  })
  closeTime: string | null;
}

class CustomRecurrenceDto {
  @ApiProperty({ example: 'day' })
  @IsString()
  frequency: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  interval: number;

  @ApiProperty({ example: 'never' })
  @IsString()
  endType: string;

  @ApiProperty({ example: '2025-12-31', nullable: true })
  @IsOptional()
  @IsDateString()
  endDate: string | null;

  @ApiProperty({ example: 10, nullable: true })
  @IsOptional()
  occurrences: number | null;
}

export class CreateWorkingHoursDto {
  @ApiProperty({ example: 1, nullable: true })
  @IsOptional()
  staffId: number | null;

  @ApiProperty({ example: '2025-09-10' })
  @IsDateString()
  date: string;

  @ApiProperty({ type: [TimeSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  timeSlots: TimeSlotDto[];

  @ApiProperty({ example: 'Shift pagi' })
  @IsOptional()
  notes: string;

  @ApiProperty({ example: 'daily' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['daily', 'not_repeat', 'weekly_on_monday', 'weekday'], {
    message:
      'repeat_type must be one of: daily, not_repeat, weekly_on_monday, weekday',
  })
  repeatType: string;

  @ApiProperty({ type: CustomRecurrenceDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomRecurrenceDto)
  customRecurrence: CustomRecurrenceDto | null;
}
