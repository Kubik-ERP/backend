import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export class AssignEmployeeDto {
  @ApiProperty({ example: 'Budi Santoso', required: false })
  @IsString()
  employeeId: string;

  @ApiProperty({ example: 'ASSIGN', required: false })
  @IsEnum(['ASSIGN', 'UNASSIGN'])
  type: 'ASSIGN' | 'UNASSIGN';
}
