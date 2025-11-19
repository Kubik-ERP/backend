import { ApiProperty } from '@nestjs/swagger';

export class DeleteTransferStockResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({
    example: 'Transfer stock deleted successfully.',
  })
  message: string;
}
