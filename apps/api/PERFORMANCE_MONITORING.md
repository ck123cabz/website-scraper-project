# Performance Monitoring Implementation

**Task:** T107 - Add performance monitoring for CSV export generation
**Phase:** 8 - Polish
**Date:** 2025-11-13

## Overview

Implemented comprehensive performance monitoring system for CSV export operations and database queries. The monitoring helps identify bottlenecks and ensures operations meet performance targets.

## Implementation Summary

### 1. Created Performance Monitor Decorator
**File:** `/apps/api/src/common/decorators/perf-monitor.decorator.ts`

A TypeScript method decorator that automatically tracks execution time with configurable thresholds:
- **Warn threshold:** Default 5000ms (configurable)
- **Error threshold:** Default 30000ms (configurable)
- **Usage:** `@PerfMonitor({ warn: 5000, error: 30000 })`

**Features:**
- Automatic timing of async methods
- Three log levels based on duration (log, warn, error)
- Error tracking with timing information
- Clean separation of monitoring from business logic

### 2. Created Stream Monitor Class
**File:** `/apps/api/src/common/decorators/stream-monitor.decorator.ts`

A Transform stream class for monitoring streaming operations:
- **Progress logging:** Configurable intervals (default: 1000ms)
- **Throughput calculation:** Rows per second
- **Final metrics:** Total rows, duration, throughput

**Note:** Not used in current implementation - export service uses manual tracking instead for better control.

### 3. Enhanced Export Service
**File:** `/apps/api/src/jobs/services/export.service.ts`

Added manual performance tracking to `processStreamExport`:
- **Row counting:** Tracks each exported row
- **Progress logs:** Every 2 seconds during export
- **Throughput calculation:** Rows per second
- **Final summary:** Total rows, duration, throughput

**Example logs:**
```
[ExportService] CSV Export (complete, job=abc-123): 2000 rows, 2500 rows/sec
[ExportService] CSV export completed: 10000 rows in 4200ms (2381 rows/sec)
```

### 4. Enhanced Jobs Service
**File:** `/apps/api/src/jobs/jobs.service.ts`

Added query performance monitoring to `getJobResults`:
- **Query timing:** Measures actual database query duration
- **Target threshold:** 500ms (logs warning if exceeded)
- **Detailed logging:** Includes row count and filter parameters
- **Debug info:** Query parameters for troubleshooting

**Example logs:**
```
[JobsService] Query fast - getJobResults took 245ms (returned 100 rows)
[JobsService] Query slow - getJobResults took 650ms (target: 500ms, returned 100 rows)
```

## Performance Targets

| Operation | Target | Threshold | Metric |
|-----------|--------|-----------|--------|
| CSV Export | <5 seconds | 10k rows | Overall duration |
| Streaming Throughput | >2,000 rows/sec | - | Rows/second |
| Database Queries | <500ms | Per query | Query execution |
| Memory Usage | <50MB | Peak | Heap size |

## Files Created

1. `/apps/api/src/common/decorators/perf-monitor.decorator.ts` - Performance monitoring decorator
2. `/apps/api/src/common/decorators/stream-monitor.decorator.ts` - Stream monitoring utility
3. `/apps/api/src/common/decorators/__tests__/perf-monitor.decorator.spec.ts` - Unit tests
4. `/apps/api/src/common/decorators/README.md` - Documentation

## Files Modified

1. `/apps/api/src/jobs/services/export.service.ts` - Added streaming performance tracking
2. `/apps/api/src/jobs/jobs.service.ts` - Added query performance monitoring

## Key Design Decisions

### Why Manual Tracking Instead of Decorator for Export?

The export service uses manual tracking instead of the `@PerfMonitor` decorator because:
1. **Streaming nature:** Method returns stream immediately, decorator timing wouldn't be accurate
2. **Progress updates:** Need periodic logging during long operations
3. **Row-level metrics:** Track throughput (rows/sec) not just duration
4. **Better control:** Custom logging intervals and metrics

### Why Inline Monitoring for Queries?

Database query monitoring is inline (not decorator) because:
1. **Precise timing:** Measure actual query execution, not validation overhead
2. **Query-specific metrics:** Log rows returned, filters applied
3. **Threshold checking:** Custom 500ms target with warn logs
4. **Context:** Include query parameters in logs

## Verification Steps

### 1. TypeScript Compilation
```bash
npx tsc --noEmit src/common/decorators/perf-monitor.decorator.ts
npx tsc --noEmit src/common/decorators/stream-monitor.decorator.ts
npx tsc --noEmit src/jobs/services/export.service.ts
npx tsc --noEmit src/jobs/jobs.service.ts
```
**Status:** ✅ All files compile without errors

### 2. Unit Tests
```bash
npm run test -- perf-monitor.decorator.spec.ts
```
**Status:** ✅ Test file created (requires Jest to run)

### 3. Integration Testing
To verify in development:
1. Start dev server: `npm run dev`
2. Create job with 100+ URLs
3. Export results in complete format
4. Check console for:
   - Progress logs every 2 seconds
   - Final throughput calculation
   - Query timing for each batch

## Monitoring Behavior

### Fast Operations (< warn threshold)
```
[PerfMonitor:ServiceName] methodName completed in 1234ms
```

### Slow Operations (>= warn, < error)
```
[PerfMonitor:ServiceName] methodName exceeded warn threshold: 5500ms > 5000ms
```

### Very Slow Operations (>= error threshold)
```
[PerfMonitor:ServiceName] methodName exceeded error threshold: 35000ms > 30000ms
```

### Method Failures
```
[PerfMonitor:ServiceName] methodName failed after 123ms: Error message here
```

## Future Enhancements

### Immediate Next Steps
1. Run unit tests to verify decorator behavior
2. Test with real export (10k+ rows) to verify throughput
3. Monitor query performance under load

### Long-term Improvements
1. **Metrics Collection:** Send timing data to monitoring service (DataDog, New Relic)
2. **Alerting:** Trigger alerts on repeated slow operations
3. **Memory Profiling:** Add heap usage tracking to detect memory leaks
4. **Query Optimization:** Auto-log slow query plans for database tuning
5. **Performance Dashboard:** Visualize metrics over time

## Dependencies

No new dependencies added - uses built-in Node.js `performance` API and NestJS `Logger`.

## Breaking Changes

None - monitoring is additive only, no API changes.

## Rollback Plan

If monitoring causes issues:
1. Remove `@PerfMonitor` decorators (keep manual tracking)
2. Reduce logging verbosity (debug -> warn only)
3. Increase thresholds to reduce log noise
4. Remove manual tracking from export service (revert to simple completion log)

## Related Tasks

- **T061:** CSV Export with Streaming (original export implementation)
- **T044:** Paginated Results API (query performance critical here)
- **Phase 8:** Polish phase - performance optimization focus

## Conclusion

Performance monitoring is now in place for all critical operations:
- ✅ CSV export throughput tracking
- ✅ Database query timing
- ✅ Reusable decorator for future methods
- ✅ Comprehensive documentation

The system is ready to help identify and resolve performance bottlenecks as the application scales.
