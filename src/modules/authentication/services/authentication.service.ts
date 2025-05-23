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
      sub: user.id,
      email: user.email,
      phone: user.phone,
      ext: user.ext,
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
    const { email, phoneNumber, phoneCountryCode, password } = payload;

    const emailExists = await this._usersService.findOneByEmail(email);
    if (emailExists) {
      throw new BadRequestException(`User already exists`);
    }

    /**
     * Hash Password
     */
    const passwordHashed = await bcrypt.hash(password, SALT_OR_ROUND);

    return await this._usersService.create({
      email: email,
      phone: parseInt(phoneNumber.toString()).toString(),
      ext: parseInt(phoneCountryCode.toString()),
      password: passwordHashed,
    });
  }

  /**
   * @description Generate TOTP OTP
   */
  public async generateOtp(email: string): Promise<object> {
    try {
      const newSecret = speakeasy.generateSecret({ length: 20 }).base32;

      // Save OTP Secret
      await this.cacheManager.set(`otp_secret:${email}`, newSecret, 300_000);

      // Generate OTP
      const otp = speakeasy.totp({
        secret: newSecret,
        encoding: 'base32',
        step: 300,
        digits: 4,
      });

      // Kirim OTP ke email
      await this._mailService.sendOtpEmail(email, otp);

      const result = {
        otp: otp,
      };

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
    const user = this._usersService.findOneByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    //generate token
    const token = uuidv4();
    const ttl = 900;

    //set token to cache with 15 minutes expiration
    await this.cacheManager.set(`forgot_token:${email}`, token, ttl);

    // send email
    this._mailService.sendMailWithTemplate(
      'forgot-password',
      'Forgot Password',
      { token: token, name: 'Kontol' },
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

    if (!cacheToken || cacheToken !== token) {
      throw new BadRequestException('Invalid token');
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
