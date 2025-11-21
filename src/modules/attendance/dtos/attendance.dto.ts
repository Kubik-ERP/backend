// src/attendance/dto/create-attendance.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class AttendanceShiftDto {
  @ApiProperty({ example: '07:00' })
  @IsString()
  shiftStart: string;

  @ApiProperty({ example: '12:00' })
  @IsString()
  shiftEnd: string;

  @ApiProperty({ example: '07:05', nullable: true })
  @IsOptional()
  clockIn: string | null;

  @ApiProperty({ example: '12:10', nullable: true })
  @IsOptional()
  clockOut: string | null;

  @ApiProperty({ example: '5h 5m', nullable: true })
  @IsOptional()
  duration: string | null;

  @ApiProperty({ example: '0m', nullable: true })
  @IsOptional()
  early: string | null;

  @ApiProperty({ example: '5m', nullable: true })
  @IsOptional()
  late: string | null;

  @ApiProperty({ example: '10m', nullable: true })
  @IsOptional()
  overtime: string | null;

  @ApiProperty({ example: 'Regular morning shift', nullable: true })
  @IsOptional()
  notes: string | null;
}

export class CreateAttendanceDto {
  @ApiProperty({
    example: 'c73c0f40-6df3-4e56-b5a6-5b4b24da5f55',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  staffId: string | null;

  @ApiProperty({ example: '2025-09-10' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Bessie Cooper #001', nullable: true })
  @IsOptional()
  staffName: string;

  @ApiProperty({ example: 'System', nullable: true })
  @IsOptional()
  createdBy: string;

  @ApiProperty({ type: [AttendanceShiftDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceShiftDto)
  shifts: AttendanceShiftDto[];
}
