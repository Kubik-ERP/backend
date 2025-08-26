import { IsEmail, IsUUID, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID('4')
  subscriptionId: string;

  @ApiProperty({
    example: '2025-08-26T07:00:00.000Z',
    description: 'ISO timestamp',
  })
  @Type(() => Date) // auto convert string → Date
  @IsDate()
  expiredAt: Date;
}
