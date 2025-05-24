import { ApiProperty } from '@nestjs/swagger';
import { invoicetype, ordertype, paymenttype } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDate, IsEnum, IsInt, Min } from 'class-validator';

export class GetListInvoiceDto {
  @ApiProperty({
    description: 'Page of the list',
    required: true,
    example: '1',
  })
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page: number;

  @ApiProperty({
    description: 'Page size of the list',
    required: true,
    example: '10',
  })
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  pageSize: number;

  //   @IsEnum(ordertype)
  //   orderType: ordertype;

  @ApiProperty({
    description: 'Payment status of the invoice',
    required: true,
    example: 'paid',
  })
  @IsEnum(invoicetype)
  paymentStatus: invoicetype;

  @ApiProperty({
    description: 'Start time of the invoice created time',
    required: true,
    example: '2025-05-15 03:28:31.430',
  })
  @Transform(({ value }) => new Date(value.replace(' ', 'T')))
  @IsDate()
  createdAtFrom: Date;

  @ApiProperty({
    description: 'End time of the invoice created time',
    required: true,
    example: '2025-05-15 03:28:31.430',
  })
  @Transform(({ value }) => new Date(value.replace(' ', 'T')))
  @IsDate()
  createdAtTo: Date;
}
