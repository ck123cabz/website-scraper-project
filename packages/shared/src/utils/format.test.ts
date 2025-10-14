import { formatDuration, formatNumber, calculateProcessingRate } from './format';

describe('formatDuration', () => {
  it('should format seconds to HH:MM:SS', () => {
    expect(formatDuration(0)).toBe('00:00:00');
    expect(formatDuration(45)).toBe('00:00:45');
    expect(formatDuration(90)).toBe('00:01:30');
    expect(formatDuration(3661)).toBe('01:01:01');
    expect(formatDuration(7200)).toBe('02:00:00');
  });

  it('should handle large durations', () => {
    expect(formatDuration(86400)).toBe('24:00:00'); // 24 hours
    expect(formatDuration(359999)).toBe('99:59:59'); // 99:59:59
  });

  it('should handle edge cases', () => {
    expect(formatDuration(-10)).toBe('00:00:00'); // negative
    expect(formatDuration(NaN)).toBe('00:00:00'); // NaN
    expect(formatDuration(Infinity)).toBe('00:00:00'); // Infinity
    expect(formatDuration(-Infinity)).toBe('00:00:00'); // -Infinity
  });

  it('should round down fractional seconds', () => {
    expect(formatDuration(45.9)).toBe('00:00:45');
    expect(formatDuration(90.5)).toBe('00:01:30');
  });
});

describe('formatNumber', () => {
  it('should format numbers with comma separators', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(42)).toBe('42');
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatNumber(999999999)).toBe('999,999,999');
  });

  it('should handle negative numbers', () => {
    expect(formatNumber(-100)).toBe('-100');
    expect(formatNumber(-1234)).toBe('-1,234');
  });

  it('should round down fractional numbers', () => {
    expect(formatNumber(1234.99)).toBe('1,234');
    expect(formatNumber(999.1)).toBe('999');
  });

  it('should handle edge cases', () => {
    expect(formatNumber(NaN)).toBe('0');
    expect(formatNumber(Infinity)).toBe('0');
    expect(formatNumber(-Infinity)).toBe('0');
  });
});

describe('calculateProcessingRate', () => {
  it('should calculate URLs per minute correctly', () => {
    expect(calculateProcessingRate(120, 60)).toBe(120); // 120 URLs in 60s = 120/min
    expect(calculateProcessingRate(50, 30)).toBe(100); // 50 URLs in 30s = 100/min
    expect(calculateProcessingRate(10, 60)).toBe(10); // 10 URLs in 60s = 10/min
    expect(calculateProcessingRate(200, 120)).toBe(100); // 200 URLs in 120s = 100/min
  });

  it('should handle high processing rates', () => {
    expect(calculateProcessingRate(1000, 10)).toBe(6000); // 1000 URLs in 10s = 6000/min
  });

  it('should handle low processing rates', () => {
    expect(calculateProcessingRate(1, 60)).toBe(1); // 1 URL in 60s = 1/min
    expect(calculateProcessingRate(1, 120)).toBe(0.5); // 1 URL in 120s = 0.5/min
  });

  it('should round to 1 decimal place', () => {
    expect(calculateProcessingRate(7, 60)).toBe(7); // Exact
    expect(calculateProcessingRate(11, 60)).toBe(11); // Exact
    expect(calculateProcessingRate(1, 90)).toBe(0.7); // 0.666... rounds to 0.7
  });

  it('should handle edge cases', () => {
    expect(calculateProcessingRate(0, 60)).toBe(0); // No URLs processed
    expect(calculateProcessingRate(100, 0)).toBe(0); // Zero elapsed time
    expect(calculateProcessingRate(-10, 60)).toBe(0); // Negative processed
    expect(calculateProcessingRate(100, -60)).toBe(0); // Negative elapsed
    expect(calculateProcessingRate(NaN, 60)).toBe(0); // NaN processed
    expect(calculateProcessingRate(100, NaN)).toBe(0); // NaN elapsed
    expect(calculateProcessingRate(Infinity, 60)).toBe(0); // Infinity
  });
});
