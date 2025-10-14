// src/working-hours/dto/create-working-hours.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { UUID } from 'crypto';

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
  staffId: UUID | null;

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

export class WorkingHoursListDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return 1;
    return parseInt(value, 10);
  })
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 10 })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return 10;
    return parseInt(value, 10);
  })
  @IsInt()
  @Min(1)
  pageSize: number = 10;
}
