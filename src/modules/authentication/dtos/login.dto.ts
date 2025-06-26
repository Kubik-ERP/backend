// Class Validator
import { IsNotEmpty, IsOptional } from 'class-validator';

// Interfaces
import { ILogin } from '../interfaces/authentication.interface';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

export class LoginUsernameDto {
  @ApiProperty()
  @IsNotEmpty()
  public username: string;

  @ApiProperty()
  @IsNotEmpty()
  public password: string;

  @ApiProperty()
  @IsOptional()
  public deviceType: string;

  @ApiProperty()
  @IsOptional()
  public browser: string;

  @ApiProperty()
  @IsOptional()
  public city: string;

  @ApiProperty()
  @IsOptional()
  public country: string;
}

export class LoginWithAccessToken implements ILogin {
  @ApiProperty()
  public accessToken: string;
}
