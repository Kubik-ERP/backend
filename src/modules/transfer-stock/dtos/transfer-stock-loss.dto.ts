import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class TransferStockLossDto {
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
  pageSize: number = 10;

  @ApiProperty({
    description: 'Field to order by. (updatedAt)',
    required: false,
    example: 'updatedAt',
  })
  @IsOptional()
  @IsIn(['updatedAt'])
  @IsString()
  orderBy: string = 'updatedAt';

  @ApiProperty({
    description: 'Sort direction: asc or desc',
    required: false,
    example: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  @IsString()
  orderDirection: 'asc' | 'desc' = 'desc';
}
