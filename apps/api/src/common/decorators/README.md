# Performance Monitoring Decorators

Task T107 [Phase 8 - Polish]

This directory contains decorators and utilities for monitoring performance-critical operations in the API.

## Available Tools

### @PerfMonitor Decorator

Monitors method execution time and logs performance metrics with configurable warn/error thresholds.

**Usage:**
```typescript
import { PerfMonitor } from './common/decorators/perf-monitor.decorator';

class MyService {
  @PerfMonitor({ warn: 5000, error: 30000 })
  async processData(): Promise<void> {
    // Method implementation
  }
}
```

**Options:**
- `warn`: Milliseconds threshold for warning logs (default: 5000ms)
- `error`: Milliseconds threshold for error logs (default: 30000ms)

**Logging Behavior:**
- `logger.log()`: Duration < warn threshold
- `logger.warn()`: Duration >= warn && < error threshold
- `logger.error()`: Duration >= error threshold
- `logger.error()`: Method throws exception (includes duration)

### StreamMonitor Class

For streaming operations (CSV export) where decorators don't work well due to the streaming nature.

**Usage:**
```typescript
import { StreamMonitor } from './common/decorators/stream-monitor.decorator';

// In export service
const monitor = new StreamMonitor('CSV Export', 2000);

// Manually track progress
rowCount++;
const now = Date.now();
if (now - lastLogTime > logInterval) {
  const elapsed = now - startTime;
  const throughput = ((rowCount / elapsed) * 1000).toFixed(0);
  this.logger.debug(
    `CSV Export: ${rowCount} rows, ${throughput} rows/sec`
  );
  lastLogTime = now;
}
```

**Parameters:**
- `operationName`: Name for logging (e.g., "CSV Export")
- `logInterval`: Milliseconds between progress logs (default: 1000ms)

**Metrics Logged:**
- Progress updates (rows processed, throughput)
- Final completion summary

## Performance Targets

### CSV Export
- **Target:** <5 seconds for 10k rows
- **Throughput:** >2,000 rows/second
- **Memory:** <50MB peak

### Database Queries
- **Target:** <500ms per query
- **Warning:** Logged if query exceeds 500ms

### Streaming Operations
- **Progress logs:** Every 2 seconds during export
- **Final metrics:** Total rows, duration, throughput

## Implementation Examples

### ExportService (Manual Tracking)
The CSV export uses manual performance tracking because:
1. Returns stream immediately (decorator timing wouldn't be accurate)
2. Need to track row-level throughput
3. Progressive logging during long operations

```typescript
// Performance tracking variables
const startTime = Date.now();
let rowCount = 0;
let lastLogTime = Date.now();
const logInterval = 2000;

// Inside streaming loop
rowCount++;
const now = Date.now();
if (now - lastLogTime > logInterval) {
  const elapsed = now - startTime;
  const throughput = ((rowCount / elapsed) * 1000).toFixed(0);
  this.logger.debug(
    `CSV Export: ${rowCount} rows, ${throughput} rows/sec`
  );
  lastLogTime = now;
}

// Final log
const duration = Date.now() - startTime;
const throughput = ((rowCount / duration) * 1000).toFixed(0);
this.logger.log(
  `CSV export completed: ${rowCount} rows in ${duration}ms (${throughput} rows/sec)`
);
```

### JobsService (Query Monitoring)
Database queries use inline performance tracking:

```typescript
const queryStart = performance.now();
const { data, error } = await query;
const queryDuration = performance.now() - queryStart;

const target = 500; // 500ms target
if (queryDuration > target) {
  this.logger.warn(
    `Query slow - took ${queryDuration.toFixed(0)}ms (target: ${target}ms)`
  );
} else {
  this.logger.debug(
    `Query fast - took ${queryDuration.toFixed(0)}ms`
  );
}
```

## When to Use Each Tool

### Use @PerfMonitor Decorator When:
- Monitoring individual method calls
- Need standardized timing with thresholds
- Method completes before returning (not streaming)
- Want clean separation of monitoring from logic

### Use Manual Tracking When:
- Streaming operations (need progress updates)
- Need custom metrics beyond duration
- Fine-grained control over logging
- Method returns immediately but work continues async

### Use Inline Query Monitoring When:
- Database operations (measure actual query time)
- Need to separate validation from query execution
- Want specific metrics (rows returned, filters applied)

## Logs Output Examples

### Fast Operation (log level)
```
[PerfMonitor:ExportService] streamCSVExport completed in 1234ms
```

### Slow Operation (warn level)
```
[PerfMonitor:ExportService] streamCSVExport exceeded warn threshold: 5500ms > 5000ms
```

### Very Slow Operation (error level)
```
[PerfMonitor:ExportService] streamCSVExport exceeded error threshold: 35000ms > 30000ms
```

### Streaming Progress
```
[ExportService] CSV Export (complete, job=abc-123): 2000 rows, 2500 rows/sec
[ExportService] CSV Export (complete, job=abc-123): 5000 rows, 2400 rows/sec
[ExportService] CSV export completed: 10000 rows in 4200ms (2381 rows/sec)
```

### Query Performance
```
[JobsService] Query fast - getJobResults took 245ms (returned 100 rows)
[JobsService] Query slow - getJobResults took 650ms (target: 500ms, returned 100 rows)
```

## Testing

See `__tests__/perf-monitor.decorator.spec.ts` for unit tests covering:
- Fast method completion (< warn threshold)
- Slow method warning (>= warn, < error threshold)
- Very slow method error (>= error threshold)
- Error handling and logging
- Default threshold behavior

## Future Enhancements

Potential improvements for future iterations:
1. **Metrics Collection**: Send timing data to monitoring service
2. **Alerting**: Trigger alerts on repeated slow operations
3. **Memory Profiling**: Add heap usage tracking
4. **Query Optimization**: Auto-log slow query plans
5. **Performance Dashboard**: Visualize metrics over time
