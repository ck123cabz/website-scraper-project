import { useEffect, useState } from 'react';

/**
 * Custom hook to calculate elapsed time since a URL started processing
 * @param currentUrlStartedAt - ISO 8601 timestamp when URL processing started, or null
 * @returns elapsedSeconds - Number of seconds elapsed since processing started (0 if null)
 */
export function useCurrentURLTimer(currentUrlStartedAt: string | null): number {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    // Reset to 0 if no URL is being processed
    if (!currentUrlStartedAt) {
      setElapsedSeconds(0);
      return;
    }

    // Calculate initial elapsed time
    const calculateElapsed = () => {
      const startTime = new Date(currentUrlStartedAt).getTime();
      const now = Date.now();
      return Math.floor((now - startTime) / 1000);
    };

    // Set initial value
    setElapsedSeconds(calculateElapsed());

    // Update every second
    const intervalId = setInterval(() => {
      setElapsedSeconds(calculateElapsed());
    }, 1000);

    // Cleanup on unmount or when currentUrlStartedAt changes
    return () => clearInterval(intervalId);
  }, [currentUrlStartedAt]);

  return elapsedSeconds;
}
