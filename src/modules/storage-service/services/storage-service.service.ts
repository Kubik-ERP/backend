import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Client } from 'minio';
import { extname } from 'path';

@Injectable()
export class StorageService {
  private readonly client: Client;

  constructor() {
    this.client = new Client({
      endPoint: process.env.MINIO_HOST || 'minio',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
      secretKey: process.env.MINIO_SECRET_KEY || 'password123',
    });
  }

  async uploadImage(
    buffer: Buffer,
    originalname: string,
    bucket = 'tes-buket',
  ) {
    const ext = extname(originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    try {
      const exists = await this.client.bucketExists(bucket);
      if (!exists) {
        await this.client.makeBucket(bucket, 'us-east-1');
      }

      await this.client.putObject(bucket, filename, buffer);
      console.log(process.env.MINIO_PUBLIC_URL);

      return {
        filename,
        bucket,
      };
    } catch (err) {
      throw new InternalServerErrorException(
        'Failed to upload to MinIO: ' + err.message,
      );
    }
  }
}
