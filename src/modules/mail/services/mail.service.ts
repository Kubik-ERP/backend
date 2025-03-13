// Library
import * as dotenv from 'dotenv';
import * as nodemailer from 'nodemailer';

// NestJs
import { Injectable } from '@nestjs/common';

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
}
