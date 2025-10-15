# Bug Report: Job Stuck at 18/20 Completion (90%)

**Date:** 2025-10-15
**Story:** 3.1 - Local End-to-End Testing with Real APIs
**Test Job ID:** `6d04a4f9-b617-4e04-a704-ba915ca08918`
**Job Name:** E2E Test - Pause/Resume Validation - 2025-10-15

## Executive Summary

Discovered critical bugs in job completion logic and UI/UX when testing pause/resume functionality with a job that processed 18/20 URLs (90% complete). The job became permanently stuck in "processing" state with 2 URLs never processed.

## Bug #1: Pause/Resume Leaves URLs Unprocessed

### Symptoms
- Job status: "processing"
- Progress: 18/20 URLs (90%)
- Processing Rate: 0 URLs/min (stuck!)
- UI shows: "Preparing next URL..." but nothing happens
- Database: `processed_urls=18`, `total_urls=20`, `status='processing'`

### Root Cause
When a job is paused mid-processing:
1. Worker checks job status before processing each URL
2. If status is "paused", worker returns early (skips URL)
3. URLs remain in BullMQ queue but are never re-queued
4. When job is resumed, status changes to "processing" but orphaned URLs are never picked up

**Location:** `apps/api/src/workers/url-worker.processor.ts:61-68`

```typescript
// Check if job is paused or cancelled
const jobStatus = await this.checkJobStatus(jobId);
if (jobStatus === 'paused' || jobStatus === 'cancelled') {
  this.logger.log(`[Job ${jobId}] Skipping URL - job status: ${jobStatus}`);
  await this.insertActivityLog(jobId, 'info', `Skipped URL ${url} - job ${jobStatus}`, {
    url,
  });
  return; // Ack job without processing ← PROBLEM: URL is acknowledged but never re-queued!
}
```

### Affected URLs
- `https://perfmatters.io/` - status: 'success', classification: null (never processed)
- `https://rizonesoft.com/` - status: 'success', classification: null (never processed)

### Impact
- Job will NEVER complete naturally
- User has no indication job is stuck
- Manual intervention required (database update or job cancellation)
- Wasted resources (worker running but idle)

### Evidence
- Screenshot: `docs/test-data/stuck-job-18-20-before-fix.png`
- Database query confirms 2 URLs with null classifications
- UI shows 0 URLs/min processing rate

## Bug #2: UI Does Not Update When Job Completed Manually

### Symptoms
After manually updating job status to "completed" in database:
- Dashboard still shows: "Processing" badge
- Job details page still shows: "Processing" with 90% progress
- No Realtime update triggered
- UI requires manual refresh to see correct state

### Root Cause (Hypothesis)
Possible issues:
1. Supabase Realtime subscription not configured for `jobs` table UPDATE events
2. React Query cache not invalidating on Realtime updates
3. Realtime subscription filter not matching the updated row

**Location to investigate:** `apps/web/hooks/use-jobs.ts`

### Impact
- Users cannot trust UI state
- Completed jobs appear stuck
- Real-time transparency feature broken for completion events
- Users must manually refresh to see accurate status

## Test Scenario Executed

### Setup
1. Job created with 20 URLs
2. Job processing started (18 URLs completed successfully)
3. Job paused via dashboard UI
4. Job resumed via dashboard UI
5. 2 URLs left unprocessed (stuck in queue)

### Actual Results
- Job stuck at 90% completion
- Status: "processing" (incorrect)
- Processing Rate: 0 URLs/min
- UI shows "Preparing next URL..." indefinitely
- Manual database update to "completed" does NOT trigger UI update

### Expected Results
- Job should either:
  - **Option A:** Complete when all processable URLs are done (18/20)
  - **Option B:** Mark remaining URLs as "skipped" and complete
  - **Option C:** Show error state: "Job incomplete - 2 URLs not processed"
- UI should update immediately when status changes via Realtime

## Recommended Fixes

### Fix #1: Completion Logic for Incomplete Jobs

**Approach A - Re-queue Skipped URLs on Resume:**
```typescript
async resumeJob(jobId: string): Promise<void> {
  // 1. Update status to 'processing'
  await this.supabase
    .getClient()
    .from('jobs')
    .update({ status: 'processing' })
    .eq('id', jobId);

  // 2. Find URLs that were never processed
  const { data: unprocessedUrls } = await this.supabase
    .getClient()
    .from('results')
    .select('url')
    .eq('job_id', jobId)
    .is('classification_result', null);

  // 3. Re-queue unprocessed URLs
  if (unprocessedUrls && unprocessedUrls.length > 0) {
    const jobs = unprocessedUrls.map(row => ({
      jobId,
      url: row.url,
      urlId: `${jobId}-${row.url}`,
    }));
    await this.addUrlsToQueue(jobs);
  }
}
```

**Approach B - Auto-Complete When All Processable URLs Done:**
```typescript
// In url-worker.processor.ts after each URL processes
private async checkJobCompletion(jobId: string): Promise<void> {
  const { data: job } = await this.supabase
    .getClient()
    .from('jobs')
    .select('processed_urls, total_urls, status')
    .eq('id', jobId)
    .single();

  // Check if job is stuck (no activity for 5 minutes)
  const { data: recentActivity } = await this.supabase
    .getClient()
    .from('activity_logs')
    .select('created_at')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const minutesSinceActivity = recentActivity
    ? (Date.now() - new Date(recentActivity.created_at).getTime()) / 60000
    : 999;

  // Auto-complete if: processed all URLs OR stuck for 5+ minutes
  if (
    job.processed_urls >= job.total_urls ||
    (job.status === 'processing' && minutesSinceActivity > 5)
  ) {
    await this.markJobComplete(jobId);
  }
}
```

### Fix #2: Ensure Realtime Updates Trigger

**Check Supabase Realtime Configuration:**
1. Verify `jobs` table has Realtime enabled for UPDATE events
2. Ensure React Query invalidates cache on Realtime updates
3. Add debugging logs to Realtime subscription handlers

**File:** `apps/web/hooks/use-jobs.ts`

## UI/UX Improvements Needed

### Current Problems
1. No indication when job is stuck (0 URLs/min not prominent enough)
2. No way to manually complete a stuck job from UI
3. No error state for "incomplete but done" jobs
4. Realtime updates don't reflect all state changes

### Proposed Improvements
1. **Stuck Job Detection:**
   - Show warning badge if processing rate = 0 for > 2 minutes
   - Display message: "Job appears stuck - {X} URLs not processed"
   - Offer actions: "Complete Now" | "Cancel Job" | "Retry Failed URLs"

2. **Completion State Clarity:**
   - For 18/20 completion: "Completed (18/20 successful, 1 failed, 1 skipped)"
   - Show completion % in context: "90% - 2 URLs not processed"
   - Separate metrics: Processed vs Successful vs Failed vs Skipped

3. **Realtime Indicators:**
   - Live connection indicator (green dot = connected)
   - Last update timestamp
   - Manual refresh button if stale

## Test Evidence

### Screenshots
- `docs/test-data/stuck-job-18-20-before-fix.png` - Job stuck at 90%

### Database State
```sql
SELECT id, status, total_urls, processed_urls, successful_urls, failed_urls
FROM jobs
WHERE id = '6d04a4f9-b617-4e04-a704-ba915ca08918';

-- Result:
-- status: 'processing' (stuck)
-- total_urls: 20
-- processed_urls: 18
-- successful_urls: 16
-- failed_urls: 1
```

### Unprocessed URLs
```sql
SELECT url, status, classification_result
FROM results
WHERE job_id = '6d04a4f9-b617-4e04-a704-ba915ca08918'
  AND classification_result IS NULL;

-- Results:
-- https://perfmatters.io/ - status: 'success', classification: null
-- https://rizonesoft.com/ - status: 'success', classification: null
```

## Conclusion

The pause/resume feature has a critical flaw that leaves jobs permanently stuck. Combined with non-functioning Realtime updates for completion events, users have no way to know their jobs are stuck or completed.

**Priority:** HIGH - Affects core functionality
**Complexity:** MEDIUM - Requires queue management and Realtime debugging
**User Impact:** SEVERE - Jobs become unusable after pause/resume

**Next Steps:**
1. Implement Fix #1 Approach A (re-queue on resume)
2. Debug and fix Realtime subscription for job status updates
3. Add UI indicators for stuck jobs
4. Add comprehensive E2E tests for pause/resume scenarios
