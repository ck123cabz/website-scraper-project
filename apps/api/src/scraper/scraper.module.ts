import { Module } from '@nestjs/common';
import { ScraperService } from './scraper.service';

/**
 * ScrapingBee integration module
 * Story 2.5: Worker Processing & Real-Time Updates
 */
@Module({
  providers: [ScraperService],
  exports: [ScraperService],
})
export class ScraperModule {}
