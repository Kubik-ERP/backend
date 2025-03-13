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
import { UserModel } from '@prisma/client';

// Interfaces
import { ILogin } from '../interfaces/authentication.interface';

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
import { UsersService } from '../../users/services/users.service';
import { MailService } from 'src/modules/mail/services/mail.service';

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
    username: string,
    pass: string,
  ): Promise<UserModel | null> {
    try {
      const user = await this._usersService.findOneByUsername(username);
      const isMatch = await bcrypt.compare(`${pass}`, user!.password);

      if (!isMatch) {
        throw new BadRequestException('Bad Request', {
          cause: new Error(),
          description: 'Invalid password',
        });
      }

      return user;
    } catch (error) {
      throw new BadRequestException('Bad Request', {
        cause: new Error(),
        description: error.response ? error?.response?.error : error.message,
      });
    }
  }

  /**
   * @description Handle business logic for logging in a user
   */
  public async login(user: IRequestUser): Promise<ILogin> {
    const payload = { username: user.username, sub: user.id };

    return {
      accessToken: this._jwtService.sign(payload),
    };
  }

  /**
   * @description Handle business logic for registering a user
   */
  public async register(payload: RegisterEmailDto): Promise<UserModel> {
    try {
      const { email, username, password } = payload;
      const emailExists = await this._usersService.findOneByEmail(email);

      if (emailExists) {
        throw new BadRequestException(`Bad Request`, {
          cause: new Error(),
          description: 'Users with email ${email} already exists',
        });
      }

      /**
       * Hash Password
       */
      const passwordHashed = await bcrypt.hash(password, SALT_OR_ROUND);

      return await this._usersService.create({
        email,
        username,
        password: passwordHashed,
      });
    } catch (error) {
      throw new BadRequestException(error.response.message, {
        cause: new Error(),
        description: error.response ? error?.response?.error : error.message,
      });
    }
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
        digits: 6,
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
  public async verifyOtp(email: string, token: string): Promise<object> {
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
      });

      if (isValid) {
        await this.cacheManager.del(`otp_secret:${email}`);
      }

      result = {
        status: isValid,
      };

      return result;
    } catch (error) {
      throw new HttpException(
        'Failed to generate OTP',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
