import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateUserDto {
  // id: number;
  // name: string;
  username: string;
  email: string;
  password: string;
  // deletedAt: Date;
}
