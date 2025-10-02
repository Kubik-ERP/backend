import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as sharp from 'sharp';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor() {
    if (!process.env.R2_BUCKET_NAME) {
      console.error('R2_BUCKET_NAME is not set');
    }

    if (!process.env.R2_ENDPOINT) {
      console.error('R2_ENDPOINT is not set');
    }

    if (!process.env.R2_ACCESS_KEY_ID) {
      console.error('R2_ACCESS_KEY_ID is not set');
    }

    if (!process.env.R2_SECRET_ACCESS_KEY) {
      console.error('R2_SECRET_ACCESS_KEY is not set');
    }

    this.bucket = process!.env!.R2_BUCKET_NAME!;

    this.s3 = new S3Client({
      region: process!.env!.R2_REGION! || 'auto',
      endpoint: process!.env!.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process!.env!.R2_ACCESS_KEY_ID!,
        secretAccessKey: process!.env!.R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  async uploadImage(buffer: Buffer, originalname: string) {
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;

    try {
      // 🧠 Kompresi dan konversi ke WebP
      const compressedBuffer = await sharp(buffer)
        .resize({ width: 1080 }) // Optional resize (bisa dihapus)
        .webp({ quality: 80 }) // Quality bisa disesuaikan (0-100)
        .toBuffer();

      const res = await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: filename,
          Body: compressedBuffer,
          ContentType: 'image/webp',
          ACL: 'public-read',
        }),
      );

      if (res.$metadata.httpStatusCode !== 200) {
        throw new InternalServerErrorException(
          'Failed to upload to R2: ' + res.$metadata.httpStatusCode,
        );
      }

      return {
        filename,
        bucket: this.bucket,
      };
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException(
        'Failed to upload to R2: ' + err.message,
      );
    }
  }
}
