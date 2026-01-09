import * as crypto from 'crypto';

export class SignatureUtil {
  // 1. GENERATE AUTH SIGNATURE (Untuk Header X-SIGNATURE)
  static generateAuthSignature(clientKey: string, timestamp: string): string {
    const clientSecret = process.env.BAYARIND_CLIENT_SECRET;

    if (!clientSecret) {
      throw new Error('BAYARIND_CLIENT_SECRET is not defined in .env');
    }

    const stringToSign = clientKey + '|' + timestamp;
    const hmac = crypto.createHmac('sha256', clientSecret);
    hmac.update(stringToSign);
    return hmac.digest('base64');
  }

  // 2. GENERATE WITHDRAW AUTH CODE (Khusus Body Withdraw)
  static generateWithdrawAuthCode(
    storeId: number | string,
    email: string,
    accountNumber: string,
    amount: number,
    timestamp: string,
  ): string {
    const clientSecret = process.env.BAYARIND_CLIENT_SECRET;

    // Format: Secret:StoreId:Email:AccNo:Amount:Timestamp
    const stringToSign = `${clientSecret}:${storeId}:${email}:${accountNumber}:${amount}:${timestamp}`;
    const base64Encoded = Buffer.from(stringToSign).toString('base64');
    const hash = crypto.createHash('sha256');
    hash.update(base64Encoded);
    return hash.digest('hex');
  }

  // 3. GENERATE TRANSACTION SIGNATURE (Opsional/General)
  static generateTransactionSignature(
    method: string,
    url: string,
    body: any,
    timestamp: string,
  ): string {
    const clientSecret = process.env.BAYARIND_CLIENT_SECRET || '';

    const minifiedBody = JSON.stringify(body);

    const bodyHash = crypto
      .createHash('sha256')
      .update(minifiedBody)
      .digest('hex')
      .toLowerCase();

    const stringToSign = `${method.toUpperCase()}:${url}:${bodyHash}:${timestamp}`;

    const hmac = crypto.createHmac('sha256', clientSecret);
    hmac.update(stringToSign);
    return hmac.digest('base64');
  }

  static generatePOSSignature(
    clientKey: string,
    clientSecret: string,
    timestamp: string,
    body: any = '', // Default string kosong untuk GET
  ): string {
    // 1. Minify Body (Sama seperti logic Postman)
    let minifiedBody = '';
    if (body && typeof body === 'object') {
      minifiedBody = JSON.stringify(body);
    } else if (typeof body === 'string') {
      minifiedBody = body;
    }

    // 2. Susun String to Sign
    // Rumus: ClientKey + Timestamp + Secret + MinifiedBody
    const stringToSign = clientKey + timestamp + clientSecret + minifiedBody;

    // 3. Base64 Encode
    const base64Encoded = Buffer.from(stringToSign, 'utf8').toString('base64');

    // 4. SHA-256 Hash -> Hex Lowercase
    const signature = crypto
      .createHash('sha256')
      .update(base64Encoded)
      .digest('hex')
      .toLowerCase();
    console.log('🔥 DEBUG SIGNATURE 🔥');
    console.log('Timestamp:', timestamp);
    console.log('ClientKey:', clientKey);
    console.log('Secret:', clientSecret);
    console.log('Body used for Sign:', JSON.stringify(body));
    console.log('Generated Signature:', signature);

    return signature;
  }
}
