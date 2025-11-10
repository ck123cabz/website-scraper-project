import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  createMockQueueEntry,
  createHighConfidenceQueueEntry,
  createLowConfidenceQueueEntry,
  createStaleQueueEntry,
} from './test-utils';

/**
 * Service for seeding test data for manual review E2E tests
 * Creates test jobs with URLs in various confidence bands
 */
@Injectable()
export class TestDataSeeder {
  private readonly logger = new Logger(TestDataSeeder.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(Url)
    private readonly urlRepository: Repository<Url>,
    @InjectRepository(ManualReviewQueue)
    private readonly queueRepository: Repository<ManualReviewQueue>,
  ) {}

  /**
   * Seed a test job with URLs across all confidence bands
   * Returns the created job ID
   */
  async seedTestJob(options?: {
    highCount?: number;
    mediumCount?: number;
    lowCount?: number;
    staleCount?: number;
  }): Promise<string> {
    const { highCount = 5, mediumCount = 10, lowCount = 5, staleCount = 2 } = options || {};

    this.logger.log(
      `Seeding test job: ${highCount} high, ${mediumCount} medium, ${lowCount} low, ${staleCount} stale`,
    );

    // Create test job
    const job = await this.jobRepository.save({
      name: `Test Job - ${new Date().toISOString()}`,
      status: 'completed',
      created_at: new Date(),
    });

    // Create high confidence URLs
    for (let i = 0; i < highCount; i++) {
      await this.createTestUrl(job.id, 'high', i);
    }

    // Create medium confidence URLs (will be queued for manual review)
    for (let i = 0; i < mediumCount; i++) {
      await this.createTestUrl(job.id, 'medium', i);
    }

    // Create low confidence URLs (will be queued for manual review)
    for (let i = 0; i < lowCount; i++) {
      await this.createTestUrl(job.id, 'low', i);
    }

    // Create stale URLs
    for (let i = 0; i < staleCount; i++) {
      await this.createStaleTestUrl(job.id, i);
    }

    this.logger.log(`Test job created with ID: ${job.id}`);
    return job.id;
  }

  /**
   * Create a single test URL with the specified confidence band
   */
  private async createTestUrl(
    jobId: string,
    band: 'high' | 'medium' | 'low',
    index: number,
  ): Promise<void> {
    const url = `https://example-${band}-${index}.com/test-page`;

    // Create URL entity
    const urlEntity = await this.urlRepository.save({
      job_id: jobId,
      url,
      status: band === 'high' ? 'approved' : 'pending',
    });

    // For medium and low confidence, create queue entry
    if (band === 'medium' || band === 'low') {
      const queueEntry =
        band === 'medium'
          ? createMockQueueEntry({
              url,
              job_id: jobId,
              url_id: urlEntity.id,
              confidence_band: 'medium',
              confidence_score: 0.65 + index * 0.01, // Vary scores slightly
            })
          : createLowConfidenceQueueEntry({
              url,
              job_id: jobId,
              url_id: urlEntity.id,
            });

      await this.queueRepository.save(queueEntry);
    }
  }

  /**
   * Create a stale test URL (queued 8+ days ago)
   */
  private async createStaleTestUrl(jobId: string, index: number): Promise<void> {
    const url = `https://example-stale-${index}.com/test-page`;

    // Create URL entity
    const urlEntity = await this.urlRepository.save({
      job_id: jobId,
      url,
      status: 'pending',
    });

    // Create stale queue entry
    const staleEntry = createStaleQueueEntry(8 + index, {
      url,
      job_id: jobId,
      url_id: urlEntity.id,
    });

    await this.queueRepository.save(staleEntry);
  }

  /**
   * Seed queue to a specific size for queue limit testing
   */
  async seedQueueToSize(targetSize: number, jobId?: string): Promise<void> {
    this.logger.log(`Seeding queue to size: ${targetSize}`);

    const currentSize = await this.queueRepository.count({
      where: { reviewed_at: null },
    });

    if (currentSize >= targetSize) {
      this.logger.log(`Queue already at or above target size (${currentSize})`);
      return;
    }

    const needed = targetSize - currentSize;

    // Create a test job if not provided
    const effectiveJobId = jobId || (await this.seedTestJob({ mediumCount: 0 }));

    // Create queue entries
    for (let i = 0; i < needed; i++) {
      const url = `https://example-queue-fill-${i}.com/test-page`;

      const urlEntity = await this.urlRepository.save({
        job_id: effectiveJobId,
        url,
        status: 'pending',
      });

      const queueEntry = createMockQueueEntry({
        url,
        job_id: effectiveJobId,
        url_id: urlEntity.id,
        confidence_band: 'medium',
        confidence_score: 0.6,
      });

      await this.queueRepository.save(queueEntry);
    }

    this.logger.log(`Queue seeded to size: ${targetSize}`);
  }

  /**
   * Clear all test data from manual review queue
   */
  async clearTestData(): Promise<void> {
    this.logger.log('Clearing all test data...');

    // Delete all queue entries
    await this.queueRepository.delete({});

    // Delete all test jobs (will cascade to URLs via foreign keys)
    await this.jobRepository.delete({
      name: { $like: 'Test Job%' },
    });

    this.logger.log('Test data cleared');
  }

  /**
   * Seed a minimal dataset for quick smoke tests
   * Returns the created job ID
   */
  async seedMinimalTestData(): Promise<string> {
    return await this.seedTestJob({
      highCount: 1,
      mediumCount: 3,
      lowCount: 1,
      staleCount: 1,
    });
  }

  /**
   * Seed a large dataset for performance testing
   * Returns the created job ID
   */
  async seedLargeTestData(): Promise<string> {
    this.logger.log('Seeding large test dataset (this may take a while)...');

    const job = await this.jobRepository.save({
      name: `Large Test Job - ${new Date().toISOString()}`,
      status: 'completed',
      created_at: new Date(),
    });

    // Create 1000 queue entries for performance testing
    const batchSize = 100;
    for (let batch = 0; batch < 10; batch++) {
      const promises = [];
      for (let i = 0; i < batchSize; i++) {
        const index = batch * batchSize + i;
        const url = `https://example-large-${index}.com/test-page`;

        const promise = this.urlRepository
          .save({
            job_id: job.id,
            url,
            status: 'pending',
          })
          .then((urlEntity) => {
            const queueEntry = createMockQueueEntry({
              url,
              job_id: job.id,
              url_id: urlEntity.id,
              confidence_band: 'medium',
              confidence_score: 0.5 + (index % 20) * 0.01, // Vary scores
            });
            return this.queueRepository.save(queueEntry);
          });

        promises.push(promise);
      }

      await Promise.all(promises);
      this.logger.log(`Batch ${batch + 1}/10 completed`);
    }

    this.logger.log(`Large test dataset created with ID: ${job.id}`);
    return job.id;
  }

  /**
   * Get current queue statistics
   */
  async getQueueStats(): Promise<{
    total: number;
    active: number;
    stale: number;
    reviewed: number;
  }> {
    const [total, active, stale, reviewed] = await Promise.all([
      this.queueRepository.count(),
      this.queueRepository.count({ where: { reviewed_at: null } }),
      this.queueRepository.count({ where: { is_stale: true, reviewed_at: null } }),
      this.queueRepository.count({ where: { reviewed_at: { $ne: null } } }),
    ]);

    return { total, active, stale, reviewed };
  }
}

/**
 * Standalone function for use in test setup/teardown
 * Creates and returns a configured seeder instance
 */
export async function createTestDataSeeder(dataSource: any): Promise<TestDataSeeder> {
  const jobRepository = dataSource.getRepository('Job');
  const urlRepository = dataSource.getRepository('Url');
  const queueRepository = dataSource.getRepository('ManualReviewQueue');

  return new TestDataSeeder(jobRepository, urlRepository, queueRepository);
}

/**
 * Helper function to seed test data in beforeAll hooks
 */
export async function setupTestData(
  dataSource: any,
  size: 'minimal' | 'standard' | 'large' = 'standard',
): Promise<string> {
  const seeder = await createTestDataSeeder(dataSource);

  if (size === 'minimal') {
    return await seeder.seedMinimalTestData();
  } else if (size === 'large') {
    return await seeder.seedLargeTestData();
  } else {
    return await seeder.seedTestJob();
  }
}

/**
 * Helper function to cleanup test data in afterAll hooks
 */
export async function teardownTestData(dataSource: any): Promise<void> {
  const seeder = await createTestDataSeeder(dataSource);
  await seeder.clearTestData();
}
