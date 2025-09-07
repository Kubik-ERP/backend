import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { extname } from 'path';
import * as sharp from 'sharp';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.MINIO_BUCKET || 'kubik-pos-staging';

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.MINIO_HOST}`,
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || '',
        secretAccessKey: process.env.MINIO_SECRET_KEY || '',
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
