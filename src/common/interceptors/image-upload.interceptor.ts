import { BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

// Interceptor for image upload (to MinIO)
export function ImageUploadInterceptor(fieldName = 'file') {
  return FileInterceptor(fieldName, {
    storage: memoryStorage(),
    limits: {
      fileSize: 100 * 1024 * 1024, // 5MB
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
