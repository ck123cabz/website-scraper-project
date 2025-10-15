import { Module } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { MockScraperService } from './scraper.service.mock';

/**
 * ScrapingBee integration module
 * Story 2.5: Worker Processing & Real-Time Updates
 * Story 3.0 Task 7: Mock service support for local testing
 *
 * Environment Variables:
 * - USE_MOCK_SERVICES=true → Use MockScraperService (no external API calls)
 * - USE_MOCK_SERVICES=false → Use ScraperService (real ScrapingBee API)
 */
@Module({
  providers: [
    {
      provide: ScraperService,
      useClass: process.env.USE_MOCK_SERVICES === 'true' ? MockScraperService : ScraperService,
    },
  ],
  exports: [ScraperService],
})
export class ScraperModule {}
