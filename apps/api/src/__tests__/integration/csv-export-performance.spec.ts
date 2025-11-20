import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'stream';
import { ExportService } from '../../jobs/services/export.service';
import { JobsService } from '../../jobs/jobs.service';
import { buildMockUrlResult } from '../performance-utils';
import type { UrlResult } from '@website-scraper/shared';

/**
 * T122 (Phase 5) - CSV Export Performance Test for SC-002
 *
 * Success Criteria:
 * - Complete format (48 columns): 10k rows exported in <5 seconds
 * - Summary format (7 columns): 10k rows exported in <2 seconds
 * - Large text fields: Handle 5KB Layer3 reasoning without memory exhaustion (<100MB peak)
 * - Streaming efficiency: Verify chunked streaming, ~2000+ rows/sec throughput, scales to 50k+
 */
describe('SC-002 CSV Export Performance Validation (T122)', () => {
  let exportService: ExportService;
  let mockJobsService: {
    getJobById: jest.Mock;
    getJobResults: jest.Mock;
  };

  beforeEach(async () => {
    // Create mock JobsService
    mockJobsService = {
      getJobById: jest.fn(),
      getJobResults: jest.fn(),
    };

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        {
          provide: JobsService,
          useValue: mockJobsService,
        },
      ],
    }).compile();

    exportService = module.get<ExportService>(ExportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test 1: Complete format (48 columns) - 10k rows in <5s
   *
   * Validates that the full 48-column CSV export (including all Layer 1/2/3 factors
   * and metadata) can be generated for 10,000 records within 5 seconds.
   */
  it('generates complete 48-column CSV for 10k rows in <5s', async () => {
    const totalRows = 10_000;
    const batchSize = 100;
    const testJobId = '00000000-0000-4000-8000-000000000001';

    // Mock job existence
    mockJobsService.getJobById.mockResolvedValue({
      id: testJobId,
      name: 'Performance Test Job',
      status: 'completed',
      total_urls: totalRows,
      processed_urls: totalRows,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    // Mock paginated results
    mockJobsService.getJobResults.mockImplementation(
      async (jobId: string, page: number, pageSize: number) => {
        const startIndex = (page - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalRows);
        const results: UrlResult[] = [];

        for (let i = startIndex; i < endIndex; i++) {
          results.push(buildMockUrlResult(i));
        }

        return {
          results,
          pagination: {
            page,
            pageSize,
            total: totalRows,
            pages: Math.ceil(totalRows / pageSize),
          },
        };
      },
    );

    // Start performance measurement
    const startTime = performance.now();

    // Get CSV stream
    const stream = await exportService.streamCSVExport(testJobId, 'complete');

    // Consume stream and count rows
    let rowCount = 0;
    let chunkCount = 0;
    let totalBytes = 0;

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        chunkCount++;
        totalBytes += chunk.length;
        // Count newlines to estimate rows (rough approximation)
        const chunkStr = chunk.toString();
        rowCount += (chunkStr.match(/\r\n/g) || []).length;
      });

      stream.on('end', () => {
        resolve();
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });

    const duration = performance.now() - startTime;
    const throughput = (totalRows / duration) * 1000; // rows per second

    // Log performance metrics
    console.log(`\nComplete Format (48 columns) Performance:`);
    console.log(`  Rows: ${totalRows}`);
    console.log(`  Duration: ${duration.toFixed(0)}ms`);
    console.log(`  Throughput: ${throughput.toFixed(0)} rows/sec`);
    console.log(`  Total bytes: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Chunks streamed: ${chunkCount}`);
    console.log(`  Avg chunk size: ${(totalBytes / chunkCount / 1024).toFixed(2)} KB`);

    // Assert: Complete export in <5000ms
    expect(duration).toBeLessThan(5000);

    // Assert: Reasonable throughput (>2000 rows/sec)
    expect(throughput).toBeGreaterThan(2000);

    // Assert: All rows were exported (including header)
    expect(rowCount).toBeGreaterThanOrEqual(totalRows);

    // Assert: Multiple chunks (verifying streaming, not buffering)
    expect(chunkCount).toBeGreaterThan(1);
  });

  /**
   * Test 2: Summary format (7 columns) - 10k rows in <2s
   *
   * Validates that the lightweight 7-column summary CSV can be generated
   * for 10,000 records within 2 seconds (stricter requirement than complete).
   */
  it('generates summary format (7 columns) for 10k rows in <2s', async () => {
    const totalRows = 10_000;
    const testJobId = '00000000-0000-4000-8000-000000000002';

    // Mock job existence
    mockJobsService.getJobById.mockResolvedValue({
      id: testJobId,
      name: 'Performance Test Job',
      status: 'completed',
      total_urls: totalRows,
      processed_urls: totalRows,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    // Mock paginated results
    mockJobsService.getJobResults.mockImplementation(
      async (jobId: string, page: number, pageSize: number) => {
        const startIndex = (page - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalRows);
        const results: UrlResult[] = [];

        for (let i = startIndex; i < endIndex; i++) {
          results.push(buildMockUrlResult(i));
        }

        return {
          results,
          pagination: {
            page,
            pageSize,
            total: totalRows,
            pages: Math.ceil(totalRows / pageSize),
          },
        };
      },
    );

    // Start performance measurement
    const startTime = performance.now();

    // Get CSV stream
    const stream = await exportService.streamCSVExport(testJobId, 'summary');

    // Consume stream
    let totalBytes = 0;
    let chunkCount = 0;

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        chunkCount++;
        totalBytes += chunk.length;
      });

      stream.on('end', () => {
        resolve();
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });

    const duration = performance.now() - startTime;
    const throughput = (totalRows / duration) * 1000; // rows per second

    // Log performance metrics
    console.log(`\nSummary Format (7 columns) Performance:`);
    console.log(`  Rows: ${totalRows}`);
    console.log(`  Duration: ${duration.toFixed(0)}ms`);
    console.log(`  Throughput: ${throughput.toFixed(0)} rows/sec`);
    console.log(`  Total bytes: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Chunks streamed: ${chunkCount}`);

    // Assert: Summary export in <2000ms (stricter than complete)
    expect(duration).toBeLessThan(2000);

    // Assert: Higher throughput for simpler format (>5000 rows/sec)
    expect(throughput).toBeGreaterThan(5000);

    // Assert: Multiple chunks (verifying streaming)
    expect(chunkCount).toBeGreaterThan(1);
  });

  /**
   * Test 3: Large text fields without memory exhaustion
   *
   * Validates that exporting 10,000 records with large Layer3 reasoning fields
   * (5KB each) doesn't cause memory exhaustion. Peak memory usage should stay
   * under 100MB increase.
   */
  it('handles 10k records with 5KB Layer3 reasoning without memory exhaustion (<100MB peak)', async () => {
    const totalRows = 10_000;
    const testJobId = '00000000-0000-4000-8000-000000000003';

    // Generate large reasoning text (5KB)
    const largeReasoning = 'A'.repeat(5 * 1024);

    // Mock job existence
    mockJobsService.getJobById.mockResolvedValue({
      id: testJobId,
      name: 'Large Text Test Job',
      status: 'completed',
      total_urls: totalRows,
      processed_urls: totalRows,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    // Mock paginated results with large text
    mockJobsService.getJobResults.mockImplementation(
      async (jobId: string, page: number, pageSize: number) => {
        const startIndex = (page - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalRows);
        const results: UrlResult[] = [];

        for (let i = startIndex; i < endIndex; i++) {
          const result = buildMockUrlResult(i);
          // Replace Layer3 reasoning with large text
          if (result.layer3_factors) {
            result.layer3_factors.reasoning = largeReasoning;
          }
          results.push(result);
        }

        return {
          results,
          pagination: {
            page,
            pageSize,
            total: totalRows,
            pages: Math.ceil(totalRows / pageSize),
          },
        };
      },
    );

    // Measure baseline memory
    const baselineMemory = process.memoryUsage();
    const startHeapUsed = baselineMemory.heapUsed / 1024 / 1024; // MB

    console.log(`\nLarge Text Fields Performance:`);
    console.log(`  Baseline heap: ${startHeapUsed.toFixed(2)} MB`);

    // Start performance measurement
    const startTime = performance.now();

    // Get CSV stream
    const stream = await exportService.streamCSVExport(testJobId, 'complete');

    // Track peak memory during streaming
    let peakMemoryIncrease = 0;
    let totalBytes = 0;

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        totalBytes += chunk.length;

        // Check memory periodically
        const currentMemory = process.memoryUsage();
        const currentHeapUsed = currentMemory.heapUsed / 1024 / 1024; // MB
        const memoryIncrease = currentHeapUsed - startHeapUsed;
        peakMemoryIncrease = Math.max(peakMemoryIncrease, memoryIncrease);
      });

      stream.on('end', () => {
        resolve();
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });

    const duration = performance.now() - startTime;

    // Final memory check
    const finalMemory = process.memoryUsage();
    const finalHeapUsed = finalMemory.heapUsed / 1024 / 1024; // MB

    // Log performance metrics
    console.log(`  Rows: ${totalRows}`);
    console.log(`  Duration: ${duration.toFixed(0)}ms`);
    console.log(`  Total bytes exported: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Peak memory increase: ${peakMemoryIncrease.toFixed(2)} MB`);
    console.log(`  Final heap: ${finalHeapUsed.toFixed(2)} MB`);

    // Assert: Peak memory increase <100MB
    expect(peakMemoryIncrease).toBeLessThan(100);

    // Assert: Still completed in reasonable time (<5s)
    expect(duration).toBeLessThan(5000);

    // Assert: Total export size is reasonable (10k rows * 5KB + overhead)
    expect(totalBytes).toBeGreaterThan(50 * 1024 * 1024); // At least 50MB
  });

  /**
   * Test 4: Streaming efficiency with 50k+ rows
   *
   * Validates that streaming scales efficiently to larger datasets (50k+ rows)
   * without buffering all data in memory. Verifies:
   * - Chunked streaming (not single buffer)
   * - Consistent throughput (>2000 rows/sec)
   * - Memory-efficient processing
   */
  it('streams 50k+ rows efficiently with chunked streaming and >2000 rows/sec throughput', async () => {
    const totalRows = 50_000;
    const testJobId = '00000000-0000-4000-8000-000000000004';

    // Mock job existence
    mockJobsService.getJobById.mockResolvedValue({
      id: testJobId,
      name: 'Large Scale Test Job',
      status: 'completed',
      total_urls: totalRows,
      processed_urls: totalRows,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    // Mock paginated results
    mockJobsService.getJobResults.mockImplementation(
      async (jobId: string, page: number, pageSize: number) => {
        const startIndex = (page - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalRows);
        const results: UrlResult[] = [];

        for (let i = startIndex; i < endIndex; i++) {
          results.push(buildMockUrlResult(i));
        }

        return {
          results,
          pagination: {
            page,
            pageSize,
            total: totalRows,
            pages: Math.ceil(totalRows / pageSize),
          },
        };
      },
    );

    // Measure baseline memory
    const baselineMemory = process.memoryUsage();
    const startHeapUsed = baselineMemory.heapUsed / 1024 / 1024; // MB

    // Start performance measurement
    const startTime = performance.now();

    // Get CSV stream
    const stream = await exportService.streamCSVExport(testJobId, 'complete');

    // Track streaming metrics
    let chunkCount = 0;
    let totalBytes = 0;
    let peakMemoryIncrease = 0;
    const chunkSizes: number[] = [];

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        chunkCount++;
        chunkSizes.push(chunk.length);
        totalBytes += chunk.length;

        // Check memory periodically (every 100 chunks)
        if (chunkCount % 100 === 0) {
          const currentMemory = process.memoryUsage();
          const currentHeapUsed = currentMemory.heapUsed / 1024 / 1024; // MB
          const memoryIncrease = currentHeapUsed - startHeapUsed;
          peakMemoryIncrease = Math.max(peakMemoryIncrease, memoryIncrease);
        }
      });

      stream.on('end', () => {
        resolve();
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });

    const duration = performance.now() - startTime;
    const throughput = (totalRows / duration) * 1000; // rows per second

    // Calculate chunk statistics
    const avgChunkSize = totalBytes / chunkCount;
    const minChunkSize = Math.min(...chunkSizes);
    const maxChunkSize = Math.max(...chunkSizes);

    // Log performance metrics
    console.log(`\nLarge Scale Streaming (50k rows) Performance:`);
    console.log(`  Rows: ${totalRows}`);
    console.log(`  Duration: ${duration.toFixed(0)}ms`);
    console.log(`  Throughput: ${throughput.toFixed(0)} rows/sec`);
    console.log(`  Total bytes: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Chunks streamed: ${chunkCount}`);
    console.log(`  Avg chunk size: ${(avgChunkSize / 1024).toFixed(2)} KB`);
    console.log(`  Min chunk size: ${(minChunkSize / 1024).toFixed(2)} KB`);
    console.log(`  Max chunk size: ${(maxChunkSize / 1024).toFixed(2)} KB`);
    console.log(`  Peak memory increase: ${peakMemoryIncrease.toFixed(2)} MB`);

    // Assert: Throughput >2000 rows/sec
    expect(throughput).toBeGreaterThan(2000);

    // Assert: Multiple chunks (verifying streaming)
    expect(chunkCount).toBeGreaterThan(100);

    // Assert: Average chunk size is reasonable (not buffering everything)
    expect(avgChunkSize).toBeLessThan(1024 * 1024); // <1MB per chunk

    // Assert: Memory efficient (peak increase <150MB for 50k rows)
    expect(peakMemoryIncrease).toBeLessThan(150);

    // Assert: Completed in reasonable time (<25s for 50k rows)
    expect(duration).toBeLessThan(25_000);
  });

  /**
   * Test 5: Verify different format complexities
   *
   * Validates performance across different export formats to ensure
   * the column complexity doesn't cause unexpected slowdowns.
   */
  it('handles different format complexities efficiently', async () => {
    const totalRows = 5_000;
    const formats: Array<'summary' | 'layer1' | 'layer2' | 'layer3' | 'complete'> = [
      'summary', // 7 columns
      'layer1', // 15 columns
      'layer2', // 25 columns
      'layer3', // 40 columns
      'complete', // 48 columns
    ];

    const results: Array<{ format: string; duration: number; throughput: number }> = [];

    const formatIds: Record<string, string> = {
      summary: '00000000-0000-4000-8000-000000000010',
      layer1: '00000000-0000-4000-8000-000000000011',
      layer2: '00000000-0000-4000-8000-000000000012',
      layer3: '00000000-0000-4000-8000-000000000013',
      complete: '00000000-0000-4000-8000-000000000014',
    };

    for (const format of formats) {
      const testJobId = formatIds[format];

      // Mock job existence
      mockJobsService.getJobById.mockResolvedValue({
        id: testJobId,
        name: `Format Test Job - ${format}`,
        status: 'completed',
        total_urls: totalRows,
        processed_urls: totalRows,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

      // Mock paginated results
      mockJobsService.getJobResults.mockImplementation(
        async (jobId: string, page: number, pageSize: number) => {
          const startIndex = (page - 1) * pageSize;
          const endIndex = Math.min(startIndex + pageSize, totalRows);
          const results: UrlResult[] = [];

          for (let i = startIndex; i < endIndex; i++) {
            results.push(buildMockUrlResult(i));
          }

          return {
            results,
            pagination: {
              page,
              pageSize,
              total: totalRows,
              pages: Math.ceil(totalRows / pageSize),
            },
          };
        },
      );

      // Start performance measurement
      const startTime = performance.now();

      // Get CSV stream
      const stream = await exportService.streamCSVExport(testJobId, format);

      // Consume stream
      await new Promise<void>((resolve, reject) => {
        stream.on('data', () => {
          // Just consume the data
        });

        stream.on('end', () => {
          resolve();
        });

        stream.on('error', (error) => {
          reject(error);
        });
      });

      const duration = performance.now() - startTime;
      const throughput = (totalRows / duration) * 1000;

      results.push({ format, duration, throughput });
    }

    // Log comparison
    console.log(`\nFormat Complexity Comparison (${totalRows} rows):`);
    results.forEach((result) => {
      console.log(
        `  ${result.format.padEnd(10)}: ${result.duration.toFixed(0).padStart(6)}ms, ${result.throughput.toFixed(0).padStart(6)} rows/sec`,
      );
    });

    // Assert: All formats complete in reasonable time
    results.forEach((result) => {
      expect(result.duration).toBeLessThan(3000); // <3s for 5k rows
      expect(result.throughput).toBeGreaterThan(1500); // >1500 rows/sec
    });

    // Assert: Summary format is fastest
    const summaryResult = results.find((r) => r.format === 'summary')!;
    const completeResult = results.find((r) => r.format === 'complete')!;
    expect(summaryResult.duration).toBeLessThan(completeResult.duration);
  });
});
