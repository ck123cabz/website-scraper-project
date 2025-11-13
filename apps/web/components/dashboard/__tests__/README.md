# Dashboard Component Tests

## Overview

This directory contains comprehensive test suites for the Dashboard components, following Test-Driven Development (TDD) principles.

## Test Files

### `useQueuePolling.spec.ts` (T074)

**Purpose**: Tests for the `useQueuePolling` custom React hook that manages real-time polling of job queue status.

**Status**: ✅ Tests written (BEFORE implementation - TDD approach)

**Test Coverage**: 21 tests across 8 categories

#### Test Categories

1. **Polling Activation (4 tests)**
   - ✅ Hook starts polling immediately on mount
   - ✅ Polling interval is 5000ms (5 seconds)
   - ✅ Each poll calls the API endpoint
   - ✅ Polling uses React Query's `refetchInterval`

2. **Stop Polling on Job Complete (3 tests)**
   - ✅ Polling stops when all jobs reach 'completed' status
   - ✅ Polling stops when job count reaches zero
   - ✅ Polling continues if even one job still processing

3. **Data Freshness (3 tests)**
   - ✅ Fresh data on each poll
   - ✅ Stale time is none (immediate refetch)
   - ✅ Data updates in real-time as jobs progress

4. **Error Handling (3 tests)**
   - ✅ Polling continues on transient errors
   - ✅ Shows error after 3 consecutive failures
   - ✅ Polling resumes after error recovery

5. **Memory & Performance (2 tests)**
   - ✅ No memory leaks on unmount
   - ✅ Polling stops when component unmounts

6. **Initial Load (2 tests)**
   - ✅ Immediate first fetch (not waiting 5s)
   - ✅ Loading state before first data arrives

7. **Conditional Polling Logic (2 tests)**
   - ✅ `refetchInterval` is false when all jobs complete
   - ✅ `refetchInterval` is 5000 when jobs are processing

8. **Options Support (2 tests)**
   - ✅ `includeCompleted` option filters completed jobs
   - ✅ `limit` option controls result count

#### Hook Interface

```typescript
interface UseQueuePollingOptions {
  includeCompleted?: boolean;
  limit?: number;
}

interface UseQueuePollingReturn {
  jobs: JobProgress[];
  completedJobs?: Job[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
}

function useQueuePolling(options?: UseQueuePollingOptions): UseQueuePollingReturn
```

#### Polling Behavior

- **Interval**: 5 seconds (5000ms)
- **Auto-start**: Begins immediately on mount
- **Auto-stop**: Stops when all jobs are completed or no jobs remain
- **Error handling**: Continues polling on transient errors, shows error after 3 consecutive failures
- **Cleanup**: Properly stops polling and cleans up on unmount

#### Implementation Requirements

The hook implementation must:

1. Use React Query's `useQuery` with `refetchInterval`
2. Set `refetchInterval` to `5000` when jobs are processing
3. Set `refetchInterval` to `false` when all jobs are complete
4. Call the backend API endpoint: `GET /jobs/queue/status`
5. Transform backend data to frontend `JobProgress` format
6. Handle errors gracefully with retry logic
7. Clean up properly on unmount (no memory leaks)
8. Support `includeCompleted` and `limit` options

#### Running the Tests

```bash
# Run all dashboard tests
npm test -- components/dashboard/__tests__

# Run only useQueuePolling tests
npm test -- components/dashboard/__tests__/useQueuePolling.spec.ts

# Watch mode
npm test -- components/dashboard/__tests__/useQueuePolling.spec.ts --watch

# With coverage
npm test -- components/dashboard/__tests__/useQueuePolling.spec.ts --coverage
```

#### Current Status

**Tests**: ✅ Complete (21 tests)
**Implementation**: ⏳ Pending (to be created in `hooks/useQueuePolling.ts`)

All tests are currently **FAILING** as expected (TDD approach). The stub implementation in the test file returns empty data to allow tests to run and show proper failure messages.

### `JobProgressCard.spec.tsx`

**Purpose**: Tests for the JobProgressCard component that displays individual job progress.

**Status**: ✅ Tests written

**Test Coverage**: Multiple categories including progress display, layer breakdown, status indicators, and accessibility.

## Test Utilities

### Mock Helpers

- `createMockJob()`: Creates mock Job data for testing
- `createMockJobProgress()`: Creates mock JobProgress data for testing
- `createWrapper()`: Creates React Query wrapper for hook testing

### Jest Configuration

- **Timers**: Fake timers enabled for polling tests (`jest.useFakeTimers()`)
- **Cleanup**: Automatic cleanup between tests
- **Mocks**: API client mocked using `jest.mock()`

## Best Practices

1. **TDD Approach**: Tests written BEFORE implementation
2. **Descriptive Names**: Clear test descriptions that explain behavior
3. **Isolation**: Each test is independent and doesn't rely on others
4. **Cleanup**: Proper cleanup after each test (timers, mocks, memory)
5. **Real Timers**: Return to real timers after tests complete
6. **Mock Hygiene**: Clear mocks between tests to prevent cross-contamination

## Dependencies

- `@testing-library/react` - React testing utilities
- `@tanstack/react-query` - React Query for data fetching
- `jest` - Test runner and assertion library
- Fake timers for polling simulation

## Next Steps

1. Implement the `useQueuePolling` hook in `/apps/web/hooks/useQueuePolling.ts`
2. Run tests to verify implementation matches specifications
3. Refactor implementation until all tests pass
4. Add integration tests if needed
5. Update coverage reports

## Notes

- All tests use fake timers to simulate polling intervals
- Tests verify exact polling behavior (5 second intervals)
- Error handling includes retry logic with exponential backoff
- Memory leak prevention is thoroughly tested
- Hook supports optional configuration via options parameter
