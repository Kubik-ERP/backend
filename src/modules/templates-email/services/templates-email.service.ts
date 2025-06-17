import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as handlebars from 'handlebars';
import { SendTemplateEmailDto } from '../dtos/send-template-email.dto';
import { UsersService } from '../../users/services/users.service';
import { MailService } from '../../mail/services/mail.service';

import { v4 as uuidv4 } from 'uuid';

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
    let subjectEmail = '';

    if (body.template === 'forgot-password') {
      const token = uuidv4();
      data = {
        token: token,
        name: user.fullname,
        base_url: process.env.FRONTEND_URL,
      };
      subjectEmail = 'Reset Password';
    } else if (body.template === 'login-notification') {
      subjectEmail = 'Login Notification';
    } else if (body.template === 'verification-email') {
      subjectEmail = 'Verification Email';
    } else if (body.template === 'register-summary') {
      subjectEmail = 'Register Summary';
    } else {
      throw new BadRequestException('Template not found');
    }

    // sent email
    this._mailService.sendMailWithTemplate(
      body.template, //note: template
      subjectEmail, //note: subject
      data, //note: data
      body.email_to, //note: email to
    );
  }
}
