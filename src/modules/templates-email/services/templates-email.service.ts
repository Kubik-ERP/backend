import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as handlebars from 'handlebars';
import { SendTemplateEmailDto } from '../dtos/send-template-email.dto';
import { UsersService } from '../../users/services/users.service';
import { MailService } from '../../mail/services/mail.service';

// Cache
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

import { v4 as uuidv4 } from 'uuid';
// Speaksy
import * as speakeasy from 'speakeasy';

// Define or import EmailTemplateType
export enum EmailTemplateType {
  RESET_PASSWORD = 'forgot-password',
  LOGIN_NOTIFICATION = 'login-notification',
  VERIFICATION_EMAIL = 'verification-email',
  REGISTER_SUMMARY = 'register-summary',
  RECEIVED_PO = 'received-po',
  RECEIPT = 'receipt',
}

@Injectable()
export class TemplatesEmailService {
  constructor(
    private readonly _usersService: UsersService,
    private readonly _mailService: MailService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    // this._secret = process.env.OTP_SECRET || speakeasy.generateSecret().base32;
  }
  public async sendTemplateEmail(body: SendTemplateEmailDto): Promise<void> {
    //validate user email
    const user = await this._usersService.findOneByEmail(body.email_to);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    let data = null;
    let subjectEmail: string;

    const templateToSubjectMap = {
      [EmailTemplateType.RESET_PASSWORD]: 'Reset Password',
      [EmailTemplateType.LOGIN_NOTIFICATION]: 'Login Notification',
      [EmailTemplateType.VERIFICATION_EMAIL]: 'Verification Email', //note: Send generate OTP
      [EmailTemplateType.REGISTER_SUMMARY]: 'Register Summary',
      [EmailTemplateType.RECEIVED_PO]: 'Received PO',
      [EmailTemplateType.RECEIPT]: 'Receipt',
    };

    if (!Object.values(EmailTemplateType).includes(body.template)) {
      throw new BadRequestException('Template not found');
    }

    if (body.template === EmailTemplateType.RESET_PASSWORD) {
      //note: Reset Password
      const token = uuidv4();
      data = {
        token: token,
        name: user.fullname,
        base_url: process.env.FRONTEND_URL,
        items: [
          {
            id: 1,
            name: 'item 1',
            description: 'Dummy description for item 1',
            price: 100,
            quantity: 10,
          },
        ],
      };
    } else if (body.template === EmailTemplateType.VERIFICATION_EMAIL) {
      //note: Verification Account Email
      const newSecret = speakeasy.generateSecret({ length: 20 }).base32;
      // Save OTP Secret within 5 minutes
      const ttl = 5 * 60 * 1000;
      await this.cacheManager.set(
        `otp_secret:${body.email_to}`,
        newSecret,
        ttl,
      );
      // Generate OTP
      const otp = speakeasy.totp({
        secret: newSecret,
        encoding: 'base32',
        step: 300,
        digits: 4,
      });
      data = {
        otp: otp,
        name: user.fullname,
      };
    } else if (body.template === EmailTemplateType.LOGIN_NOTIFICATION) {
      // note: Login Notification
      data = {
        fullname: user.fullname,
        loginDate: '2025-06-20',
        loginTime: '10:30 WIB',
        deviceType: 'Desktop',
        browser: 'Chrome 114.0',
        city: 'Jakarta',
        country: 'Indonesia',
      };
    } else if (body.template === EmailTemplateType.RECEIPT) {
      //
    }
    subjectEmail = templateToSubjectMap[body.template];

    // * Open this one for bugging
    // console.log('Bugging', {
    //   template: body.template,
    //   subjectEmail: subjectEmail,
    //   safeInvoice: safeInvoice,
    //   data: data,
    //   email_to: email ? email : body.email_to,
    // });

    // sent email
    this._mailService.sendMailWithTemplate(
      body.template, //note: template
      subjectEmail, //note: subject
      data, //note: data
      body.email_to, //note: email to
    );
  }
}
