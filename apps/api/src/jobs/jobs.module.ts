import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { FileParserService } from './services/file-parser.service';
import { UrlValidationService } from './services/url-validation.service';
import { memoryStorage } from 'multer';
import { extname } from 'path';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(), // Use memory storage to avoid file cleanup issues (H2 fix)
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, callback) => {
        const allowedExtensions = ['.csv', '.txt'];
        const ext = extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          callback(null, true);
        } else {
          callback(new Error('Invalid file type. Only .csv and .txt files are allowed.'), false);
        }
      },
    }),
  ],
  controllers: [JobsController],
  providers: [JobsService, FileParserService, UrlValidationService],
  exports: [JobsService],
})
export class JobsModule {}
