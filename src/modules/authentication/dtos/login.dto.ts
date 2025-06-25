// Class Validator
import { IsNotEmpty } from 'class-validator';

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
  public deviceType: string;

  @ApiProperty()
  public browser: string;

  @ApiProperty()
  public city: string;

  @ApiProperty()
  public country: string;
}

export class LoginWithAccessToken implements ILogin {
  @ApiProperty()
  public accessToken: string;
}
