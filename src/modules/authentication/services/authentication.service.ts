// Bcrypt
import * as bcrypt from 'bcrypt';

// Cache
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

// Constants
import { SALT_OR_ROUND } from '../../../common/constants/common.constant';

// DTOs
import { RegisterEmailDto } from '../dtos/register.dto';

// Entities
import { users } from '@prisma/client';

// Enum
import { OTPStatus } from '../../../enum/login-enum';

// Interfaces
import { ILogin } from '../interfaces/authentication.interface';

//UUID
import { v4 as uuidv4 } from 'uuid';

import { TemplatesEmailService } from '../../templates-email/services/templates-email.service';
import { EmailTemplateType } from '../../templates-email/dtos/send-template-email.dto';

// NestJS Libraries
import {
  BadRequestException,
  Injectable,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Services
import { MailService } from 'src/modules/mail/services/mail.service';
import { UsersService } from '../../users/services/users.service';

// Speaksy
import * as speakeasy from 'speakeasy';

@Injectable()
export class AuthenticationService {
  // private _secret: string;
  // private _usedOtps: Set<string> = new Set();
  constructor(
    private readonly _usersService: UsersService,
    private readonly _jwtService: JwtService,
    private readonly _mailService: MailService,
    private readonly templatesEmailService: TemplatesEmailService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    // this._secret = process.env.OTP_SECRET || speakeasy.generateSecret().base32;
  }

  /**
   * @description Handle business logic for validating a user
   */
  public async validateUser(
    email: string,
    pass: string,
  ): Promise<users | null> {
    const user = await this._usersService.findOneByEmail(email);
    if (!user) {
      throw new BadRequestException('Username / password is incorrect');
    }

    const isMatch = await bcrypt.compare(`${pass}`, user!.password);

    if (!isMatch) {
      throw new BadRequestException('Username / password is incorrect');
    }

    return user;
  }

  /**
   * @description Handle business logic for logging in a user
   */
  public async login(user: IRequestUser): Promise<ILogin> {
    const payload = {
      username: user.username,
      sub: parseInt(user.id.toString()),
      email: user.email,
      phone: user.phone,
      ext: user.ext,
      fullname: user.fullname,
      verified_at: parseInt(user.verified_at?.toString() || '0'),
      role: user.role,
    };
    return {
      accessToken: this._jwtService.sign(payload),
    };
  }

  /**
   * @description Handle business logic for registering a user
   */
  public async register(payload: RegisterEmailDto): Promise<users> {
    const { email, phoneNumber, phoneCountryCode, password, fullName } =
      payload;

    const emailExists = await this._usersService.findOneByEmail(email);
    if (emailExists) {
      throw new BadRequestException(`User already exists`);
    }

    /**
     * Hash Password
     */
    const passwordHashed = await bcrypt.hash(password, SALT_OR_ROUND);
    const role_id = await this._usersService.getRoleIdByRoleName('Owner');
    return await this._usersService.create({
      email: email,
      phone: parseInt(phoneNumber.toString()).toString(),
      ext: parseInt(phoneCountryCode.toString()),
      password: passwordHashed,
      fullname: fullName,
      role_id: role_id!,
    });
  }

  /**
   * @description Generate TOTP OTP
   */
  public async generateOtp(email: string): Promise<object> {
    try {
      // Kirim OTP ke email
      const result = await this.templatesEmailService.sendEmailGenerateOtp(
        EmailTemplateType.VERIFICATION_EMAIL,
        email, //note: Email
      );

      return result;
    } catch (error) {
      throw new HttpException(
        'Failed to generate OTP',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * @description Verify OTP
   */
  public async verifyOtp(
    email: string,
    token: string,
    type: string,
  ): Promise<object> {
    try {
      let result;

      // Find secret in cache
      const secret = await this.cacheManager.get<string>(`otp_secret:${email}`);
      if (!secret) {
        result = {
          status: false,
        };

        return result;
      }

      const isValid = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        step: 300,
        window: 1,
        digits: 4,
      });

      if (isValid) {
        await this.cacheManager.del(`otp_secret:${email}`);
      }

      // update user to verified
      const otpType = type as OTPStatus;
      if (otpType === OTPStatus.Register) {
        const userInfo = await this._usersService.findOneByEmail(email);

        if (!userInfo) {
          throw new BadRequestException('User not found');
        }

        await this._usersService.update(userInfo.id, {
          verified_at: Math.floor(Date.now() / 1000),
        });
      }

      result = {
        status: isValid,
      };

      return result;
    } catch (error) {
      throw new HttpException(
        'Failed to verify OTP',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async forgotPassword(email: string): Promise<void> {
    //validate user email
    const user = await this._usersService.findOneByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    //generate token
    const token = uuidv4();
    const ttl = 15 * 60 * 1000;

    //set token to cache with 15 minutes expiration
    await this.cacheManager.set(`forgot_token:${email}`, token, ttl);

    // send email
    this._mailService.sendMailWithTemplate(
      'forgot-password',
      'Forgot Password',
      { token: token, name: user.fullname, base_url: process.env.FRONTEND_URL },
      email,
    );
  }

  public async forgotPasswordReset(
    email: string,
    password: string,
    token: string,
  ): Promise<void> {
    //validate token
    const cacheToken = await this.cacheManager.get<string>(
      `forgot_token:${email}`,
    );
    console.log('cacheToken', cacheToken);
    if (!cacheToken || cacheToken !== token) {
      throw new BadRequestException('Expired / Invalid token');
    }

    //hash password
    const passwordHashed = await bcrypt.hash(password, SALT_OR_ROUND);

    //update user password
    const user = await this._usersService.findOneByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this._usersService.update(user.id, { password: passwordHashed });

    //delete token
    await this.cacheManager.del(`forgot_token:${email}`);
  }
}
