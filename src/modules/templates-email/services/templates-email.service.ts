import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as handlebars from 'handlebars';
import { SendTemplateEmailDto } from '../dtos/send-template-email.dto';
import { UsersService } from '../../users/services/users.service';
import { MailService } from '../../mail/services/mail.service';

import { v4 as uuidv4 } from 'uuid';

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
      [EmailTemplateType.VERIFICATION_EMAIL]: 'Verification Email',
      [EmailTemplateType.REGISTER_SUMMARY]: 'Register Summary',
      [EmailTemplateType.RECEIVED_PO]: 'Received PO',
      [EmailTemplateType.RECEIPT]: 'Receipt',
    };

    if (!Object.values(EmailTemplateType).includes(body.template)) {
      throw new BadRequestException('Template not found');
    }

    if (body.template === EmailTemplateType.RESET_PASSWORD) {
      const token = uuidv4();
      data = {
        token: token,
        name: user.fullname,
        base_url: process.env.FRONTEND_URL,
      };
    }

    subjectEmail = templateToSubjectMap[body.template];

    // sent email
    this._mailService.sendMailWithTemplate(
      body.template, //note: template
      subjectEmail, //note: subject
      data, //note: data
      body.email_to, //note: email to
    );
  }
}
