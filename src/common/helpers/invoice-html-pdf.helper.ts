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
    format: 'A4',
    printBackground: true,
    margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' },
  });

  await browser.close();
  return Buffer.from(pdfBuffer);
}
