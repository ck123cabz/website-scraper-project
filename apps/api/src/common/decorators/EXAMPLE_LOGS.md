# Performance Monitoring - Example Logs

This document shows example log output from the performance monitoring system.

## CSV Export - Complete Format (10,000 rows)

### Successful Export (Fast)

```
[ExportService] Starting CSV export for job abc-123-def-456 with format: complete

[JobsService] Querying job results: jobId=abc-123-def-456, page=1, pageSize=100, filter=all, layer=all, confidence=all
[JobsService] Query fast - getJobResults took 245ms (returned 100 rows)

[ExportService] CSV Export (complete, job=abc-123-def-456): 2000 rows, 2500 rows/sec

[JobsService] Querying job results: jobId=abc-123-def-456, page=21, pageSize=100, filter=all, layer=all, confidence=all
[JobsService] Query fast - getJobResults took 198ms (returned 100 rows)

[ExportService] CSV Export (complete, job=abc-123-def-456): 5000 rows, 2450 rows/sec

[JobsService] Querying job results: jobId=abc-123-def-456, page=51, pageSize=100, filter=all, layer=all, confidence=all
[JobsService] Query fast - getJobResults took 223ms (returned 100 rows)

[ExportService] CSV Export (complete, job=abc-123-def-456): 8000 rows, 2420 rows/sec

[JobsService] Querying job results: jobId=abc-123-def-456, page=100, pageSize=100, filter=all, layer=all, confidence=all
[JobsService] Query fast - getJobResults took 212ms (returned 100 rows)

[ExportService] CSV export completed: 10000 rows in 4132ms (2420 rows/sec)
```

**Result:** ✅ Target met (4.1s < 5s target, 2420 rows/sec > 2000 target)

---

### Slow Export (Approaching Threshold)

```
[ExportService] Starting CSV export for job xyz-789-abc-123 with format: complete

[JobsService] Querying job results: jobId=xyz-789-abc-123, page=1, pageSize=100, filter=all, layer=all, confidence=all
[JobsService] Query slow - getJobResults took 782ms (target: 500ms, returned 100 rows)

[ExportService] CSV Export (complete, job=xyz-789-abc-123): 2000 rows, 1800 rows/sec

[JobsService] Querying job results: jobId=xyz-789-abc-123, page=21, pageSize=100, filter=all, layer=all, confidence=all
[JobsService] Query slow - getJobResults took 654ms (target: 500ms, returned 100 rows)

[ExportService] CSV Export (complete, job=xyz-789-abc-123): 5000 rows, 1750 rows/sec

[ExportService] CSV export completed: 10000 rows in 5812ms (1720 rows/sec)
```

**Result:** ⚠️ Below target (5.8s > 5s target, 1720 rows/sec < 2000 target)
**Action:** Investigate database query performance, check indexes

---

## CSV Export - Summary Format (1,000 rows)

```
[ExportService] Starting CSV export for job def-456-ghi-789 with format: summary

[JobsService] Querying job results: jobId=def-456-ghi-789, page=1, pageSize=100, filter=all, layer=all, confidence=all
[JobsService] Query fast - getJobResults took 156ms (returned 100 rows)

[ExportService] CSV export completed: 1000 rows in 823ms (1215 rows/sec)
```

**Result:** ✅ Target met (0.8s < 5s target)
**Note:** Summary format has only 7 columns vs 48 for complete, so faster per row

---

## Database Query Performance

### Fast Query (No Filters)

```
[JobsService] Querying job results: jobId=abc-123, page=1, pageSize=20, filter=all, layer=all, confidence=all
[JobsService] Query fast - getJobResults took 123ms (returned 20 rows)
```

**Result:** ✅ Well under 500ms target

---

### Slow Query (With Filters)

```
[JobsService] Querying job results: jobId=xyz-789, page=1, pageSize=100, filter=approved, layer=layer3, confidence=high
[JobsService] Query slow - getJobResults took 687ms (target: 500ms, returned 42 rows)
```

**Result:** ⚠️ Above target
**Action:** Check if indexes exist for confidence_band and eliminated_at_layer columns

---

### Failed Query

```
[JobsService] Querying job results: jobId=invalid-id, page=1, pageSize=20, filter=all, layer=all, confidence=all
[JobsService] Query failed: Failed to fetch job results: invalid input syntax for type uuid: "invalid-id"
```

**Result:** ❌ Error caught and logged

---

## Decorator Usage Examples

### Fast Method (< warn threshold)

```typescript
@PerfMonitor({ warn: 5000, error: 30000 })
async processUrls(): Promise<void> {
  // Takes 1.2 seconds
}
```

**Output:**
```
[PerfMonitor:UrlProcessor] processUrls completed in 1234ms
```

---

### Slow Method (>= warn, < error)

```typescript
@PerfMonitor({ warn: 5000, error: 30000 })
async analyzeUrls(): Promise<void> {
  // Takes 7 seconds
}
```

**Output:**
```
[PerfMonitor:UrlAnalyzer] analyzeUrls exceeded warn threshold: 7123ms > 5000ms
```

---

### Very Slow Method (>= error threshold)

```typescript
@PerfMonitor({ warn: 5000, error: 30000 })
async processLargeJob(): Promise<void> {
  // Takes 35 seconds
}
```

**Output:**
```
[PerfMonitor:JobProcessor] processLargeJob exceeded error threshold: 35456ms > 30000ms
```

---

### Method With Error

```typescript
@PerfMonitor({ warn: 5000, error: 30000 })
async validateData(): Promise<void> {
  // Fails after 500ms
  throw new Error('Invalid data format');
}
```

**Output:**
```
[PerfMonitor:DataValidator] validateData failed after 523ms: Invalid data format
```

---

## Production Monitoring Examples

### High Load Scenario (10 concurrent exports)

```
[ExportService] Starting CSV export for job job-001 with format: complete
[ExportService] Starting CSV export for job job-002 with format: complete
[ExportService] Starting CSV export for job job-003 with format: complete
...

[JobsService] Query slow - getJobResults took 1234ms (target: 500ms, returned 100 rows)
[JobsService] Query slow - getJobResults took 1456ms (target: 500ms, returned 100 rows)

[ExportService] CSV export completed: 10000 rows in 8234ms (1214 rows/sec)
[ExportService] CSV export completed: 10000 rows in 9123ms (1096 rows/sec)
```

**Result:** ⚠️ Performance degradation under load
**Action:** Consider connection pooling, query optimization, or rate limiting

---

### Database Index Missing

```
[JobsService] Query slow - getJobResults took 2345ms (target: 500ms, returned 100 rows)
[JobsService] Query slow - getJobResults took 2567ms (target: 500ms, returned 100 rows)
[JobsService] Query slow - getJobResults took 2234ms (target: 500ms, returned 100 rows)
```

**Result:** ⚠️ Consistent slow queries
**Action:** Check execution plan, verify indexes on job_id, status, eliminated_at_layer, confidence_band

---

## Performance Dashboard Metrics

If metrics are exported to monitoring service:

### Ideal Performance (Green)
- CSV Export: 95th percentile < 5s
- Query Performance: 95th percentile < 500ms
- Throughput: 95th percentile > 2000 rows/sec

### Warning Performance (Yellow)
- CSV Export: 95th percentile 5-10s
- Query Performance: 95th percentile 500-1000ms
- Throughput: 95th percentile 1000-2000 rows/sec

### Critical Performance (Red)
- CSV Export: 95th percentile > 10s
- Query Performance: 95th percentile > 1000ms
- Throughput: 95th percentile < 1000 rows/sec

---

## Log Level Configuration

### Production (INFO + WARN + ERROR)
- Progress logs: Disabled
- Fast queries: Not logged
- Slow queries: WARNING
- Export completion: INFO
- Errors: ERROR

### Development (DEBUG + INFO + WARN + ERROR)
- Progress logs: Every 2 seconds
- Fast queries: DEBUG
- Slow queries: WARNING
- Export completion: INFO
- Errors: ERROR

### Verbose/Troubleshooting (ALL)
- All of the above plus:
- Query parameters
- Row counts
- Memory usage
- Thread info
