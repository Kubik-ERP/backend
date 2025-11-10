import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, Matches, IsInt, Min } from 'class-validator';

export class EmployeeCommissionLogsListDto {
  // --- pagination

  @ApiProperty({
    description: 'Page of the list',
    required: true,
    example: '1',
  })
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page: number = 1;

  @ApiProperty({
    description: 'Page size of the list',
    required: true,
    example: '10',
  })
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  pageSize: number;

  // --- filter

  @ApiProperty({
    required: false,
    description: 'Start date in DD-MM-YYYY format. Empty string allowed.',
    default: '',
  })
  @IsOptional()
  @Matches(/^$|^\d{2}-\d{2}-\d{4}$/, {
    message: 'startDate must be empty or in DD-MM-YYYY format',
  })
  startDate?: string = '';

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @Matches(/^$|^\d{2}-\d{2}-\d{4}$/, {
    message: 'endDate must be empty or in DD-MM-YYYY format',
  })
  endDate?: string = '';
}
