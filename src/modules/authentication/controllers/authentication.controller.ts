// Decorators
//import { ApiBaseResponse } from '../../../common/decorators/api-base-response.decorator';

// DTOs
import { GenerateOtpDto } from '../dtos/generate-otp.dto';
import { LoginUsernameDto, LoginWithAccessToken } from '../dtos/login.dto';
import { RegisterEmailDto, SetPinDto } from '../dtos/register.dto';
import { VerifyOtpDto } from '../dtos/verify-otp.dto';
import { StaffLoginDto } from '../dtos/staff-signin.dto';

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
  Param,
  Post,
  Put,
  Redirect,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

// Services
import { AuthenticationService } from '../services/authentication.service';
import { UsersService } from '../../users/services/users.service';
import {
  ForgotPasswordDto,
  ForgotPasswordResetDto,
} from '../dtos/forgot-password.dto';
import { AuthGuard } from '@nestjs/passport';
import { PinGuard } from 'src/common/guards/authentication-pin.guard';
import { AuthenticationProfileGuard } from 'src/common/guards/authentication-profile.guard';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { access } from 'fs';
import { NoAuthPinGuard } from 'src/common/guards/noauth-pin.guard';

import { TemplatesEmailService } from '../../templates-email/services/templates-email.service';
// Enum
import { EmailTemplateType } from '../../../enum/EmailTemplateType-enum';

@Controller('authentication')
@ApiTags('Authentication')
export class AuthenticationController {
  constructor(
    private readonly _authenticationService: AuthenticationService,
    private readonly _usersService: UsersService,
    private readonly templatesEmailService: TemplatesEmailService,
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
    const sentEmailLoginNotification =
      await this.templatesEmailService.sendEmailLoginNotification(
        EmailTemplateType.LOGIN_NOTIFICATION,
        _body, //note: Email
      );

    return {
      message: 'User logged in successfully',
      result,
      data_sentEmailLoginNotification: sentEmailLoginNotification,
    };
  }

  @Post('register')
  @ApiOperation({
    summary: 'Register with email',
  })
  //@ApiBaseResponse(UsersEntity)
  public async create(@Body() requestBody: RegisterEmailDto) {
    const result = await this._authenticationService.register(requestBody);
    const login = await this._authenticationService.login({
      email: result.email,
      phone: parseInt(result.phone?.toString()),
      fullname: result.fullname?.toString(),
      id: result.id,
      username: result.email,
      ext: result.ext,
      ownerId: result.id,
    });

    return {
      message: 'User registered successfully',
      result: {
        accessToken: login.accessToken,
      },
    };
  }

  @UseGuards(AuthenticationProfileGuard)
  @Get('profile')
  @ApiBearerAuth()
  public async getProfile(@Req() req: ICustomRequestHeaders) {
    const result = await this._usersService.findOneById(req.user.id);

    const response = {
      fullname: result.fullname,
      usingPin: result.pin !== '' && result.pin !== null ? true : false,
      email: result.email,
      phone: result.phone,
      roles: result.roles,
      is_verified:
        result.verified_at !== null && result.verified_at !== BigInt(0)
          ? true
          : false,
      id: result.id,
      is_staff: result.is_staff,
      limitStore: result.store_quota ?? 0,
      isAccessRetail: result.isAccessRetail,
      staffId: result.employees?.id,
    };
    return {
      success: true,
      message: 'Authenticated user profile has been retrieved successfully',
      result: toCamelCase(response),
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @Post('pin/:type')
  @ApiBearerAuth()
  @ApiParam({
    name: 'type',
    enum: ['set', 'unset'],
    description: 'Action type, must be either "set" or "unset"',
  })
  @UseGuards(PinGuard)
  public async handlePin(
    @Param('type') type: string,
    @Req() req: ICustomRequestHeaders,
    @Body() body: SetPinDto,
  ) {
    try {
      switch (type) {
        case 'set':
          if (!body.pin) {
            throw new BadRequestException('PIN is required');
          }
          break;
        case 'unset':
          if (body.pin) {
            throw new BadRequestException(
              'PIN should not be set when unsetting',
            );
          }
          break;
        default:
          throw new BadRequestException('Invalid type. Use "set" or "unset"');
      }

      await this._usersService.handlePin(req.user.id, body.pin);

      return {
        success: true,
        message: 'Authenticated user pin has been updated successfully',
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
  @UseGuards(NoAuthPinGuard)
  @ApiHeader({
    name: 'pin',
    description: 'PIN code for authentication',
    required: false,
  })
  public async forgotPassword(@Body() body: ForgotPasswordDto) {
    try {
      // await this._authenticationService.forgotPassword(body.email);
      await this.templatesEmailService.sendEmailResetPassword(
        EmailTemplateType.RESET_PASSWORD,
        body.email, //note: Email
      );

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

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Login with Google (redirect to Google)' })
  async googleAuth() {
    // Passport akan redirect ke Google
  }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth2 callback endpoint' })
  async googleAuthRedirect(@Req() req: ICustomRequestHeaders) {
    const result = await this._authenticationService.login(req.user);
    return {
      message: 'User logged in successfully',
      result,
    };
  }

  @ApiOperation({
    summary: 'Staff login with email and device code',
    description:
      'Authenticate staff member using email and device code. This validates the staff member, device code, and store association.',
  })
  @Post('staff/login')
  public async staffLogin(@Body() body: StaffLoginDto) {
    try {
      const result = await this._authenticationService.staffLogin(body);
      return {
        statusCode: 200,
        message: 'Staff logged in successfully',
        result,
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

  @ApiOperation({
    summary: 'Staff logout',
    description: 'Logout staff member and deactivate session',
  })
  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @Post('staff/logout')
  public async staffLogout(@Req() req: ICustomRequestHeaders) {
    try {
      await this._authenticationService.staffLogout(req);
      return {
        statusCode: 200,
        message: 'Staff logged out successfully',
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
