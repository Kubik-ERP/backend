import { ApiProperty } from '@nestjs/swagger';

export class CheckProductDestinationResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({
    example:
      'Some products were not found in the destination store and have been created automatically.',
  })
  message: string;
}