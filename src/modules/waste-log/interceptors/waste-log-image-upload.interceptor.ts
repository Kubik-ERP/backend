import { BadRequestException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

// Interceptor for multiple image uploads in waste log (to handle payload[n].image format)
export function WasteLogImageUploadInterceptor() {
  return FilesInterceptor('images', 20, {
    storage: memoryStorage(),
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB per file
    },
    fileFilter: (req, file, cb) => {
      // Allow both regular field names and payload[n].image format
      if (
        file.fieldname.startsWith('payload[') ||
        file.fieldname === 'images' ||
        file.mimetype.match(/^image\/(jpeg|png|jpg|gif|webp)$/)
      ) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Only image files are allowed!'), false);
      }
    },
  });
}
