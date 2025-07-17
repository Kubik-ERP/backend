// src/storage/storage.service.ts
import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { extname } from 'path';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.MINIO_BUCKET || 'kubik-pos-staging';

    this.s3 = new S3Client({
      region: 'auto', // wajib untuk R2
      endpoint: `https://${process.env.MINIO_HOST}`, // contoh: <your_account_id>.r2.cloudflarestorage.com
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || '',
        secretAccessKey: process.env.MINIO_SECRET_KEY || '',
      },
    });
  }

  async uploadImage(buffer: Buffer, originalname: string) {
    const ext = extname(originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    try {
      const res =await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: filename,
          Body: buffer,
          ContentType: this.getMimeType(ext),
          ACL: 'public-read', // kalau perlu diakses publik
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

  private getMimeType(ext: string): string {
    if (ext === '.png') return 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.gif') return 'image/gif';
    return 'application/octet-stream';
  }
}
