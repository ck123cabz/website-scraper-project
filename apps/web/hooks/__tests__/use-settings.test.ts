import { buildUpdatePayload } from '../useSettings';
import { ClassificationSettings } from '@website-scraper/shared';

describe('buildUpdatePayload', () => {
  it('strips metadata and coerces numeric fields', () => {
    const settings = {
      id: 'test-id',
      prefilter_rules: [
        {
          category: 'test',
          pattern: '^example\\.com$',
          reasoning: 'Sample rule',
          enabled: 'true' as unknown as boolean,
        },
      ],
      classification_indicators: ['Indicator 1'],
      llm_temperature: '0.45' as unknown as number,
      confidence_threshold: '0.55' as unknown as number,
      content_truncation_limit: '12000' as unknown as number,
      updated_at: '2025-10-16T00:00:00.000Z',
    } satisfies ClassificationSettings;

    const payload = buildUpdatePayload(settings);

    expect(payload).toEqual({
      prefilter_rules: [
        {
          category: 'test',
          pattern: '^example\\.com$',
          reasoning: 'Sample rule',
          enabled: true,
        },
      ],
      classification_indicators: ['Indicator 1'],
      llm_temperature: 0.45,
      confidence_threshold: 0.55,
      content_truncation_limit: 12000,
    });
  });
});
