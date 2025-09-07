// Class Validator
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Interfaces
import { ILogin } from '../interfaces/authentication.interface';

// NestJS Libraries
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

export class LoginUsernameDto {
  @ApiProperty()
  @IsNotEmpty()
  public username: string;

  @ApiProperty()
  @IsNotEmpty()
  public password: string;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  public deviceType?: string;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  public browser: string;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  public city: string;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  public country: string;
}

export class LoginWithAccessToken implements ILogin {
  @ApiProperty()
  public accessToken: string;
}
