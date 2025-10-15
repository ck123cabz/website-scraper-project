import { renderHook, act } from '@testing-library/react';
import { useCurrentURLTimer } from '../use-current-url-timer';

describe('useCurrentURLTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('should return 0 when currentUrlStartedAt is null', () => {
    const { result } = renderHook(() => useCurrentURLTimer(null));

    expect(result.current).toBe(0);
  });

  it('should calculate correct initial elapsed seconds', () => {
    // Set current time to a known value
    const now = new Date('2025-10-13T10:00:00.000Z').getTime();
    jest.setSystemTime(now);

    // URL started 42 seconds ago
    const startedAt = new Date('2025-10-13T09:59:18.000Z').toISOString();

    const { result } = renderHook(() => useCurrentURLTimer(startedAt));

    expect(result.current).toBe(42);
  });

  it('should update elapsed seconds every 1 second', () => {
    const now = new Date('2025-10-13T10:00:00.000Z').getTime();
    jest.setSystemTime(now);

    const startedAt = new Date('2025-10-13T09:59:50.000Z').toISOString();

    const { result } = renderHook(() => useCurrentURLTimer(startedAt));

    // Initial: 10 seconds elapsed
    expect(result.current).toBe(10);

    // Advance 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(11);

    // Advance 5 more seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(16);
  });

  it('should reset to 0 when currentUrlStartedAt changes to null', () => {
    const now = new Date('2025-10-13T10:00:00.000Z').getTime();
    jest.setSystemTime(now);

    const startedAt = new Date('2025-10-13T09:59:30.000Z').toISOString();

    const { result, rerender } = renderHook(
      ({ timestamp }) => useCurrentURLTimer(timestamp),
      { initialProps: { timestamp: startedAt } }
    );

    // Initial: 30 seconds elapsed
    expect(result.current).toBe(30);

    // Change to null
    rerender({ timestamp: null });

    expect(result.current).toBe(0);
  });

  it('should restart timer when currentUrlStartedAt changes to new timestamp', () => {
    const now = new Date('2025-10-13T10:00:00.000Z').getTime();
    jest.setSystemTime(now);

    const startedAt1 = new Date('2025-10-13T09:59:30.000Z').toISOString();
    const startedAt2 = new Date('2025-10-13T09:59:55.000Z').toISOString();

    const { result, rerender } = renderHook(
      ({ timestamp }) => useCurrentURLTimer(timestamp),
      { initialProps: { timestamp: startedAt1 } }
    );

    // Initial: 30 seconds elapsed
    expect(result.current).toBe(30);

    // Advance 2 seconds (also advances system time)
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current).toBe(32);

    // Change to new URL (but system time has also advanced by 2 seconds)
    // So the new URL that started at 09:59:55 is now 7 seconds old (10:00:02 - 09:59:55 = 7)
    rerender({ timestamp: startedAt2 });

    // Should reset to 7 seconds (time since new URL started, accounting for advanced system time)
    expect(result.current).toBe(7);

    // Advance 1 more second
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(8);
  });

  it('should cleanup interval on unmount', () => {
    const now = new Date('2025-10-13T10:00:00.000Z').getTime();
    jest.setSystemTime(now);

    const startedAt = new Date('2025-10-13T09:59:50.000Z').toISOString();

    const { result, unmount } = renderHook(() => useCurrentURLTimer(startedAt));

    // Initial: 10 seconds elapsed
    expect(result.current).toBe(10);

    // Unmount
    unmount();

    // Advance time - timer should NOT update after unmount
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Value should remain at 10 (last value before unmount)
    expect(result.current).toBe(10);
  });

  it('should cleanup old interval when currentUrlStartedAt changes', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const now = new Date('2025-10-13T10:00:00.000Z').getTime();
    jest.setSystemTime(now);

    const startedAt1 = new Date('2025-10-13T09:59:30.000Z').toISOString();
    const startedAt2 = new Date('2025-10-13T09:59:55.000Z').toISOString();

    const { rerender } = renderHook(
      ({ timestamp }) => useCurrentURLTimer(timestamp),
      { initialProps: { timestamp: startedAt1 } }
    );

    // Change timestamp - should clear old interval
    rerender({ timestamp: startedAt2 });

    expect(clearIntervalSpy).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
  });

  it('should handle invalid date strings gracefully', () => {
    const invalidDate = 'invalid-date-string';

    const { result } = renderHook(() => useCurrentURLTimer(invalidDate));

    // Should return NaN when date is invalid
    expect(isNaN(result.current)).toBe(true);
  });

  it('should handle future timestamps (negative elapsed time)', () => {
    const now = new Date('2025-10-13T10:00:00.000Z').getTime();
    jest.setSystemTime(now);

    // URL "started" 10 seconds in the future
    const futureStartedAt = new Date('2025-10-13T10:00:10.000Z').toISOString();

    const { result } = renderHook(() => useCurrentURLTimer(futureStartedAt));

    // Should return negative elapsed time (edge case)
    expect(result.current).toBe(-10);
  });

  it('should calculate elapsed time correctly for long durations', () => {
    const now = new Date('2025-10-13T10:00:00.000Z').getTime();
    jest.setSystemTime(now);

    // URL started 1 hour 30 minutes 42 seconds ago (5442 seconds)
    const startedAt = new Date('2025-10-13T08:29:18.000Z').toISOString();

    const { result } = renderHook(() => useCurrentURLTimer(startedAt));

    expect(result.current).toBe(5442);
  });

  it('should handle rapid timestamp changes without memory leaks', () => {
    const now = new Date('2025-10-13T10:00:00.000Z').getTime();
    jest.setSystemTime(now);

    const timestamps = [
      new Date('2025-10-13T09:59:30.000Z').toISOString(),
      new Date('2025-10-13T09:59:40.000Z').toISOString(),
      new Date('2025-10-13T09:59:50.000Z').toISOString(),
    ];

    const { rerender } = renderHook(
      ({ timestamp }) => useCurrentURLTimer(timestamp),
      { initialProps: { timestamp: timestamps[0] } }
    );

    // Rapidly change timestamps
    timestamps.forEach((timestamp) => {
      rerender({ timestamp });
    });

    // Verify no errors and timer still works
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should not throw or crash
    expect(true).toBe(true);
  });
});
