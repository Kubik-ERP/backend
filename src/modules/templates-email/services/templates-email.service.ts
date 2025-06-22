import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as handlebars from 'handlebars';
import { SendTemplateEmailDto } from '../dtos/send-template-email.dto';
import { UsersService } from '../../users/services/users.service';
import { MailService } from '../../mail/services/mail.service';
import { InvoiceService } from '../../invoices/services/invoices.service';

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
  private readonly templateToSubjectMap = {
    [EmailTemplateType.RESET_PASSWORD]: 'Reset Password',
    [EmailTemplateType.LOGIN_NOTIFICATION]: 'Login Notification',
    [EmailTemplateType.VERIFICATION_EMAIL]: 'Verification Email',
    [EmailTemplateType.REGISTER_SUMMARY]: 'Register Summary',
    [EmailTemplateType.RECEIVED_PO]: 'Received PO',
    [EmailTemplateType.RECEIPT]: 'Receipt',
  };
  constructor(
    private readonly _usersService: UsersService,
    private readonly _mailService: MailService,
    private readonly _invoiceService: InvoiceService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    // this._secret = process.env.OTP_SECRET || speakeasy.generateSecret().base32;
    handlebars.registerHelper('multiply', (a, b) => a * b);
    handlebars.registerHelper('add', (a, b) => a + b);
    handlebars.registerHelper(
      'formatCurrency',
      (value) => `Rp ${Number(value).toLocaleString('id-ID')}`,
    );
  }
  public async sendTemplateEmail(body: SendTemplateEmailDto): Promise<any> {
    try {
      //validate user email
      const user = await this._usersService.findOneByEmail(body.email_to);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      let data = null;
      let subjectEmail: string;
      let email = null;
      let safeInvoice = null;

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
        // Find the invoice by id
        const invoiceId = body.invoiceId;
        const invoice = await this._invoiceService.getInvoicePreview({
          invoiceId,
        });

        // Ambil email dari customer invoice
        email = invoice.customer?.email;

        if (!email) {
          throw new Error('Customer email not found');
        }

        // Pastikan invoice_details berisi data yang valid
        if (!invoice.invoice_details || invoice.invoice_details.length === 0) {
          throw new Error('Invoice details not found');
        }

        // Ensure created_at is not null and is a string or Date
        data = {
          ...invoice,
          created_at: invoice.created_at ?? new Date(),
          name: invoice.customer?.name ?? 'Unknown Customer',
        };
      }
      subjectEmail = templateToSubjectMap[body.template];

      // sent email
      this._mailService.sendMailWithTemplate(
        body.template + '.ejs', //note: template
        subjectEmail, //note: subject
        data, //note: data
        body.email_to, //note: email to
      );

      // * Open this one for bugging
      return {
        template: body.template, //note: template
        subjectEmail: subjectEmail, //note: subject
        data: data, //note: data
        email_to: body.email_to, //note: email to
      };
    } catch (error) {
      console.log('error sent email', error);
      throw new Error(`Error sent email with error ${error}`);
    }
  }
  public async sendEmailInvoice(
    template: EmailTemplateType,
    invoiceId: string,
  ): Promise<any> {
    try {
      let data = null;
      let subjectEmail: string;
      let email = null;

      if (!Object.values(EmailTemplateType).includes(template)) {
        throw new BadRequestException('Template not found');
      }

      // Find the invoice by id
      const invoice = await this._invoiceService.getInvoicePreview({
        invoiceId,
      });

      // Ambil email dari customer invoice
      email = invoice.customer?.email;

      if (!email) {
        throw new Error('Customer email not found');
      }

      // Pastikan invoice_details berisi data yang valid
      if (!invoice.invoice_details || invoice.invoice_details.length === 0) {
        throw new Error('Invoice details not found');
      }

      // Ensure created_at is not null and is a string or Date
      data = {
        ...invoice,
        created_at: invoice.created_at ?? new Date(),
        name: invoice.customer?.name ?? 'Unknown Customer',
      };
      subjectEmail = this.templateToSubjectMap[template];

      // sent email
      this._mailService.sendMailWithTemplate(
        template + '.ejs', //note: template
        subjectEmail, //note: subject
        data, //note: data
        email, //note: email to
      );

      return {
        template: template, //note: template
        subjectEmail: subjectEmail, //note: subject
        data: data, //note: data
        email_to: email, //note: email to
      };
    } catch (error) {
      console.log('error sent email', error);
      throw new Error(`Error sent email with error ${error}`);
    }
  }
}
