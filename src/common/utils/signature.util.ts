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
}
