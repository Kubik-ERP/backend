import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

//interceptors for upload images
export function ImageUploadInterceptor(fieldName = 'file') {
  return FileInterceptor(fieldName, {
    storage: diskStorage({
      destination: './public/images',
      filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueName + extname(file.originalname));
      },
    }),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpeg|png|jpg|gif|webp)$/)) {
        return cb(
          new BadRequestException('Only image files are allowed!'),
          false,
        );
      }
      cb(null, true);
    },
  });
}
