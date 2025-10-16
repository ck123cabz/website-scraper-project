import { Injectable, Logger } from '@nestjs/common';

/**
 * Layer 2: Operational Filtering Service (STUB for Story 2.5-refactored)
 *
 * Story 2.6 (PENDING): Full implementation will include:
 * - Company page detection (About Us, Contact, Team)
 * - Blog freshness analysis (recent posts in last 90 days)
 * - Tech stack validation (CMS, frameworks, hosting)
 *
 * TEMPORARY STUB: Currently passes ALL URLs through to Layer 3
 * This allows Story 2.5-refactored to be tested without blocking on Story 2.6
 *
 * TODO: Replace this stub with full implementation in Story 2.6
 */

export interface Layer2Result {
  passed: boolean;
  reasoning: string;
  signals?: {
    companyPageFound?: boolean;
    blogFreshnessScore?: number;
    techStack?: string[];
    lastBlogPostDate?: string;
    contactInfoPresent?: boolean;
  };
  processingTimeMs?: number;
}

@Injectable()
export class Layer2OperationalFilterService {
  private readonly logger = new Logger(Layer2OperationalFilterService.name);

  /**
   * Validate operational signals for a URL (STUB)
   *
   * @param url - The URL to validate
   * @param content - Scraped homepage content (title, meta, body, links, etc.)
   * @returns Layer2Result with pass/fail and signals
   */
  async validateOperational(url: string, content: any): Promise<Layer2Result> {
    const startTime = Date.now();

    // STUB: Pass ALL URLs through to Layer 3
    // Real implementation in Story 2.6 will analyze homepage content
    this.logger.debug(`[STUB] Layer 2 operational filter for ${url.slice(0, 100)} - PASS (stub always passes)`);

    return {
      passed: true, // STUB: Always pass
      reasoning: 'PASS - Layer 2 stub (Story 2.6 pending, passes all URLs)',
      signals: {
        companyPageFound: undefined, // Unknown - stub doesn't check
        blogFreshnessScore: undefined,
        techStack: [],
        lastBlogPostDate: undefined,
        contactInfoPresent: undefined,
      },
      processingTimeMs: Date.now() - startTime,
    };
  }
}
