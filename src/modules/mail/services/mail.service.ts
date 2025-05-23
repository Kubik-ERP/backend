// Library
import * as dotenv from 'dotenv';
import * as nodemailer from 'nodemailer';

// NestJs
import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as handlebars from 'handlebars';
import * as fs from 'fs-extra';

dotenv.config();

@Injectable()
export class MailService {
  private _transporter;

  constructor() {
    this._transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: false,
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
    });
  }

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    await this._transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}`,
      html: `<p>Your OTP code is: <strong>${otp}</strong></p>`,
    });
  }

  async sendMailWithTemplate(
    template: string,
    subject: string,
    data: any,
    to: string,
  ): Promise<void> {
    const htmlTemplate = await this.loadTemplate(template, data);
    await this._transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject: subject,
      html: htmlTemplate,
    });

    console.log(`mail send to ${to} with subject ${subject}`);
  }

  private async loadTemplate(templateName: string, data: any): Promise<string> {
    try {
      const filePath = path.resolve(
        __dirname,
        '../../../../src/common/htmls',
        `${templateName}.html`,
      );
      console.log(data);
      const templateFile = await fs.readFile(filePath, 'utf-8');
      const compiledTemplate = handlebars.compile(templateFile);
      return compiledTemplate(data);
    } catch (error) {
      console.log(error);
      throw new Error('Failed to load template');
    }
  }
}
