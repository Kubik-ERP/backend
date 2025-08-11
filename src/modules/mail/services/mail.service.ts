// Library
import * as dotenv from 'dotenv';
import * as nodemailer from 'nodemailer';

// NestJs
import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as handlebars from 'handlebars';

import * as ejs from 'ejs';
import * as fs from 'fs';

dotenv.config();

@Injectable()
export class MailService {
  private _transporter;

  constructor() {
    const port = Number(process.env.MAIL_PORT) || 587;
    // Gmail / most providers:
    // - Port 465 -> implicit TLS (secure true)
    // - Port 587 -> STARTTLS (secure false, upgrade later)
    const secure = port === 465; // only use true for implicit TLS

    this._transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port,
      secure,
      auth: process.env.MAIL_USERNAME
        ? {
            user: process.env.MAIL_USERNAME,
            pass: process.env.MAIL_PASSWORD,
          }
        : undefined,
      tls: {
        // Allow STARTTLS upgrade; can relax cert checking if needed via env
        rejectUnauthorized:
          process.env.MAIL_TLS_REJECT_UNAUTHORIZED === 'false' ? false : true,
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
    const formattedDate = createdAt.toLocaleDateString('id-ID'); // Format DD/MM/YYYY
    const formattedTime = createdAt.toLocaleTimeString('id-ID', {
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
  }

  private async loadTemplate(templateName: string, data: any): Promise<string> {
    try {
      // Tentukan path untuk folder partials
      const partialsPath = path.resolve(
        __dirname,
        '../../../../src/common/htmls/partials',
      );

      // Path untuk header dan footer
      const headerPath = path.join(partialsPath, 'header.ejs'); // Ganti dengan .ejs
      const footerPath = path.join(partialsPath, 'footer.ejs'); // Ganti dengan .ejs

      // Membaca file header dan footer
      const header = await fs.promises.readFile(headerPath, 'utf-8');
      const footer = await fs.promises.readFile(footerPath, 'utf-8');

      // Mendaftarkan partials untuk EJS
      // EJS tidak membutuhkan register partial seperti Handlebars, jadi kita bisa langsung memasukkan header dan footer ke dalam data.
      data.header = header;
      data.footer = footer;

      // Path untuk template utama
      const filePath = path.resolve(
        __dirname,
        '../../../../src/common/htmls',
        `${templateName}`,
      );

      console.log('Bugging filePath', filePath);

      // Membaca file template
      // console.log('data in template email', data);
      const templateFile = await fs.promises.readFile(filePath, 'utf-8');

      // Render template dengan EJS
      const html = ejs.render(templateFile, data);

      console.log('Success to load template');

      return html;
    } catch (error) {
      console.log(error);
      throw new Error('Failed to load template');
    }
  }
}
