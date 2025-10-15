import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { FileParserService } from './services/file-parser.service';
import { UrlValidationService } from './services/url-validation.service';
import { PreFilterService } from './services/prefilter.service';
import { LlmService } from './services/llm.service';
import { MockLlmService } from './services/llm.service.mock';
import { QueueModule } from '../queue/queue.module';
import { SettingsModule } from '../settings/settings.module';
import { memoryStorage } from 'multer';
import { extname } from 'path';

/**
 * Jobs Module
 * Story 3.0: Settings integration for database-driven classification parameters
 *
 * Environment Variables:
 * - USE_MOCK_SERVICES=true → Use MockLlmService (no external LLM API calls)
 * - USE_MOCK_SERVICES=false → Use LlmService (real Gemini/GPT APIs)
 */
@Module({
  imports: [
    QueueModule, // Import QueueModule to access QueueService
    SettingsModule, // Import SettingsModule for database-driven settings (Story 3.0)
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
  providers: [
    JobsService,
    FileParserService,
    UrlValidationService,
    PreFilterService,
    {
      provide: LlmService,
      useClass: process.env.USE_MOCK_SERVICES === 'true' ? MockLlmService : LlmService,
    },
  ],
  exports: [JobsService, PreFilterService, LlmService],
})
export class JobsModule {}
