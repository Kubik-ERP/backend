import * as puppeteer from 'puppeteer';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import * as fs from 'fs';
import * as ejs from 'ejs';

export async function generateInvoiceHtmlPdf(invoice: any): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();

  const templatePath = resolve(
    process.cwd(),
    'src/templates',
    'invoice-template.ejs',
  );

  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `Template invoice tidak ditemukan di path: ${templatePath}`,
    );
  }

  const template = readFileSync(templatePath, 'utf8');
  const html = ejs.render(template, { invoice });

  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A6',
    width: '58mm',
    height: 'auto',
    printBackground: true,
    margin: {
      top: '10mm',
      bottom: '10mm',
      left: '10mm',
      right: '10mm',
    },
  });

  await browser.close();
  return Buffer.from(pdfBuffer);
}
