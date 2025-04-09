import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'johndoe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  public username?: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  public email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  public password: string;

  @ApiProperty({ example: '62', description: 'Country code' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  public ext?: number;

  @ApiProperty({
    example: '81234567890',
    description: 'Phone number without country code',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  public phone?: string;

  @ApiProperty({
    example: 1710592800,
    description: 'User creation timestamp (UNIX)',
  })
  @IsOptional()
  @IsNumber()
  public created_at?: number;

  @ApiProperty({
    example: 1710596400,
    description: 'Last update timestamp (UNIX)',
  })
  @IsOptional()
  @IsNumber()
  public updated_at?: number;

  @ApiProperty({
    example: 1710682800,
    description: 'Verification timestamp (UNIX)',
  })
  @IsOptional()
  @IsNumber()
  public verified_at?: number;

  @ApiProperty({
    example: null,
    description: 'Soft delete timestamp (UNIX), null if active',
  })
  @IsOptional()
  @IsNumber()
  public deleted_at?: number;
}
