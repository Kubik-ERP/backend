import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsIn, IsInt, Min } from 'class-validator';

export class DeviceCodesListDto {
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

  // --- order by

  @ApiProperty({
    description: 'Field to order by. (name, code, status, lastConnectedAt)',
    required: false,
    example: 'name',
  })
  @IsOptional()
  @IsIn(['name', 'code', 'status', 'lastConnectedAt'])
  @IsString()
  orderBy: string = 'name';

  @ApiProperty({
    description: 'Sort direction: asc or desc',
    required: false,
    example: 'asc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  @IsString()
  orderDirection: 'asc' | 'desc' = 'desc';
}
