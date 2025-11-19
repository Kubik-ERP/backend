import { ApiProperty } from '@nestjs/swagger';

export class ChangeStatusResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({
    description: 'Pesan hasil perubahan status transfer stock',
    example: 'Transfer stock approved successfully.',
  })
  message: string;
}
