// Bcrypt
import * as bcrypt from 'bcrypt';

// Cache
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

// Constants
import { SALT_OR_ROUND } from '../../../common/constants/common.constant';

// DTOs
import { RegisterEmailDto } from '../dtos/register.dto';
import { StaffLoginDto } from '../dtos/staff-signin.dto';

// Entities
import { users } from '@prisma/client';

// Enum
import { OTPStatus } from '../../../enum/login-enum';

// Interfaces
import { ILogin } from '../interfaces/authentication.interface';

//UUID
import { v4 as uuidv4 } from 'uuid';

import { EmailTemplateType } from '../../../enum/EmailTemplateType-enum';
import { TemplatesEmailService } from '../../templates-email/services/templates-email.service';

// NestJS Libraries
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Services
import { MailService } from 'src/modules/mail/services/mail.service';
import { PrismaService } from '../../../prisma/prisma.service';
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
    private readonly _prisma: PrismaService,
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
      is_staff: false,
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

  /**
   * @description Handle staff sign-in with email and device code
   */
  public async staffLogin(payload: StaffLoginDto): Promise<ILogin> {
    const { email, deviceCode } = payload;

    // Validate email exists in employees table and get user data
    const employee = await this._prisma.employees.findFirst({
      where: {
        email: email.toLowerCase(),
      },
      include: {
        users: true, // Get user data for JWT payload
      },
    });

    if (!employee) {
      throw new BadRequestException('Email not found');
    }

    const storeId = employee.stores_id;

    // Memastikan device code ada di store yang sama dengan employee
    const deviceCodeRecord = await this._prisma.device_codes.findFirst({
      where: {
        code: deviceCode,
        store_id: storeId,
      },
    });
    if (!deviceCodeRecord) {
      throw new BadRequestException('Device code not found');
    }

    // Memastikan device code belum terhubung dengan employee lain
    if (
      deviceCodeRecord.status === 'connected' &&
      deviceCodeRecord.employee_id !== employee.id
    ) {
      throw new BadRequestException(
        'Device code already connected to another employee',
      );
    }

    const employeeAssignedDevice = await this._prisma.device_codes.findFirst({
      where: {
        employee_id: employee.id,
        store_id: storeId,
      },
    });

    if (
      employeeAssignedDevice &&
      employeeAssignedDevice.id !== deviceCodeRecord.id
    ) {
      throw new BadRequestException(
        'You already have an active session with different device code',
      );
    }

    // Memastikan employee belum memiliki sesi aktif (1 employee = 1 browser)
    // Jika ada, hapus sesi yang sudah ada (ini juga akan memutus device)
    const existingSession =
      await this._prisma.employee_login_sessions.findUnique({
        where: {
          employee_id: employee.id,
        },
      });

    if (existingSession) {
      // Update status device code menjadi disconnected dan hapus employee_id
      await this._prisma.device_codes.update({
        where: {
          id: existingSession.device_code_id,
        },
        data: {
          status: 'disconnected',
          employee_id: null,
        },
      });

      // Hapus sesi yang sudah ada
      await this._prisma.employee_login_sessions.delete({
        where: {
          employee_id: employee.id,
        },
      });
    }

    const owner = await this._prisma.users.findFirst({
      where: {
        user_has_stores: {
          some: {
            stores: {
              employees: {
                some: {
                  id: employee.id,
                },
              },
            },
          },
        },
      },
    });

    if (!owner) {
      throw new BadRequestException('Owner not found');
    }

    const accessToken = this._jwtService.sign({
      username: employee.users.username,
      sub: employee.users.id,
      email: employee.users.email,
      phone: employee.users.phone,
      ext: employee.users.ext,
      fullname: employee.users.fullname,
      verified_at: parseInt(employee.users.verified_at?.toString() || '0'),
      role: employee.users.role_id,
      is_staff: true, // Flag to identify staff login

      // Staff specific data
      employeeId: employee.id,
      storeId: deviceCodeRecord.store_id,
      deviceCodeId: deviceCodeRecord.id,
      ownerId: owner.id,
    });

    // Buat sesi login
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days session

    await this._prisma.employee_login_sessions.create({
      data: {
        employee_id: employee.id,
        device_code_id: deviceCodeRecord.id,
        store_id: deviceCodeRecord.store_id,
        access_token: accessToken,
        expires_at: expiresAt,
      },
    });

    // Update status device code menjadi connected dan set last_connected_at
    await this._prisma.device_codes.update({
      where: {
        id: deviceCodeRecord.id,
      },
      data: {
        status: 'connected',
        last_connected_at: new Date(),
        employee_id: employee.id,
      },
    });

    return {
      accessToken: accessToken,
      storeId: deviceCodeRecord.store_id,
    };
  }

  /**
   * @description Handle staff logout
   */
  public async staffLogout(req: ICustomRequestHeaders): Promise<void> {
    if (!req.user.is_staff) {
      throw new BadRequestException('Invalid session');
    }

    const employee = await this._prisma.employees.findFirst({
      select: {
        id: true,
      },
      where: {
        user_id: req.user.id,
      },
    });
    if (!employee) {
      throw new BadRequestException('Invalid session');
    }

    const accessToken = req.headers.authorization?.split(' ')[1];

    // Find the session
    const session = await this._prisma.employee_login_sessions.findFirst({
      where: {
        employee_id: employee.id,
        access_token: accessToken,
      },
    });

    if (!session) {
      throw new BadRequestException('Invalid session');
    }

    // Update device code status to disconnected (keep employee_id assigned)
    await this._prisma.device_codes.update({
      where: {
        id: session.device_code_id,
      },
      data: {
        status: 'disconnected',
        employee_id: null,
        employee_login_sessions: {
          // Delete the session
          delete: true,
        },
      },
    });
  }
}
