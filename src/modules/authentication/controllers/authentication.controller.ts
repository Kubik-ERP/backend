// Decorators
//import { ApiBaseResponse } from '../../../common/decorators/api-base-response.decorator';

// DTOs
import { GenerateOtpDto } from '../dtos/generate-otp.dto';
import { LoginUsernameDto, LoginWithAccessToken } from '../dtos/login.dto';
import { RegisterEmailDto } from '../dtos/register.dto';
import { VerifyOtpDto } from '../dtos/verify-otp.dto';

// Entities
import { UsersEntity } from '../../users/entities/users.entity';
import {
  GenerateOtpEntity,
  VerifyOtpEntity,
} from '../../authentication/entities/authentication.entity';

// Guards
import { AuthenticationJWTGuard } from '../../../common/guards/authentication-jwt.guard';
import { AuthenticationLocalGuard } from '../../../common/guards/authentication-local.guard';

// NestJS Libraries
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// Services
import { AuthenticationService } from '../services/authentication.service';
import { UsersService } from '../../users/services/users.service';
import {
  ForgotPasswordDto,
  ForgotPasswordResetDto,
} from '../dtos/forgot-password.dto';

@Controller('authentication')
@ApiTags('Authentication')
export class AuthenticationController {
  constructor(
    private readonly _authenticationService: AuthenticationService,
    private readonly _usersService: UsersService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Login with username and password',
  })
  //@ApiBaseResponse(LoginWithAccessToken)
  @UseGuards(AuthenticationLocalGuard)
  public async login(
    @Body() _body: LoginUsernameDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const result = await this._authenticationService.login(req.user);

    return {
      message: 'User logged in successfully',
      result,
    };
  }

  @Post('register')
  @ApiOperation({
    summary: 'Register with email',
  })
  //@ApiBaseResponse(UsersEntity)
  public async create(@Body() requestBody: RegisterEmailDto) {
    const result = await this._authenticationService.register(requestBody);

    return {
      message: 'User registered successfully',
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @Get('profile')
  @ApiBearerAuth()
  public async getProfile(@Req() req: ICustomRequestHeaders) {
    const result = await this._usersService.findOneById(req.user.id);

    const response = {
      username: result.username,
      email: result.email,
      id: result.id,
    };
    return {
      success: true,
      message: 'Authenticated user profile has been retrieved successfully',
      result: response,
    };
  }

  @Post('otp/generate')
  @ApiOperation({
    summary: 'Generate OTP',
  })
  //@ApiBaseResponse(GenerateOtpEntity)
  public async generateOtp(@Body() body: GenerateOtpDto) {
    const result = await this._authenticationService.generateOtp(body.email);

    return {
      result,
    };
  }

  @Post('otp/verify')
  @ApiOperation({
    summary: 'Verify OTP',
  })
  //@ApiBaseResponse(VerifyOtpEntity)
  public async verifyOtp(@Body() body: VerifyOtpDto) {
    const result = await this._authenticationService.verifyOtp(
      body.email,
      body.otp,
      body.type,
    );

    return {
      result,
    };
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Send Forgot Password Token',
  })
  public async forgotPassword(@Body() body: ForgotPasswordDto) {
    try {
      await this._authenticationService.forgotPassword(body.email);

      return {
        message:
          'Email sent successfully, Please check your inbox / spam folder',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('forgot-password')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Change Password Forgot',
  })
  public async changePasswordForgot(@Body() body: ForgotPasswordResetDto) {
    try {
      await this._authenticationService.forgotPasswordReset(
        body.email,
        body.password,
        body.token,
      );

      return {
        message: 'Password Change Successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
