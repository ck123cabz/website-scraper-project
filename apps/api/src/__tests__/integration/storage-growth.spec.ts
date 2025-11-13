import { estimateStorageUsage } from '../performance-utils';

/**
 * T119 (Phase 9) - Storage growth test for SC-010
 *
 * Ensures the JSONB footprint for url_results stays under 50 MB per 10,000 URLs.
 * Uses realistic Layer 1/2/3 payloads to approximate production storage usage.
 */
describe('SC-010 Storage Footprint Validation (T119)', () => {
  it('keeps storage growth under 50MB per 10k URLs', () => {
    const { perRecordBytes, bytesPer10k } = estimateStorageUsage(1000);
    const megabytesPer10k = bytesPer10k / (1024 * 1024);

    expect(perRecordBytes).toBeLessThan(5_000); // ~5 KB per URL including all layers
    expect(megabytesPer10k).toBeLessThan(50);
  });
});
