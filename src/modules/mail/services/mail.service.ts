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

  async sendEmailInvoiceById(
    to: string,
    invoice: {
      created_at: string | Date;
      customer_name?: string;
      [key: string]: any;
    },
    invoiceId: string,
    pdfBuffer?: Buffer,
  ): Promise<void> {
    const createdAt = new Date(invoice.created_at);
    const formattedDate = createdAt.toLocaleDateString('en-GB'); // Format DD/MM/YYYY
    const formattedTime = createdAt.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const customer_name = invoice.customer.name || 'Valued Customer';

    const mailOptions: any = {
      from: process.env.SMTP_FROM,
      to,
      subject: 'Invoice Details',
      text: `Dear Customer,\n\nYour invoice details are as follows:\n\nInvoice ID: ${invoiceId}\nDate: ${formattedDate} ${formattedTime}`,
      html: `
      <p>Dear Customer, ${customer_name}</p>
      <p>Your invoice details are as follows:</p>
      <p><strong>Invoice ID:</strong> ${invoiceId}</p>
      <p><strong>Date:</strong> ${formattedDate} ${formattedTime}</p>
    `,
    };

    if (pdfBuffer) {
      mailOptions.attachments = [
        {
          filename: `invoice-${invoiceId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ];
    }

    await this._transporter.sendMail(mailOptions);
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
