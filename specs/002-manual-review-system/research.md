# Research: Manual Review System

**Feature**: Complete Settings Implementation (Manual Review System)
**Date**: 2025-11-11
**Status**: Phase 0 Research

## Overview

This document resolves all technical unknowns and clarifications identified in the Technical Context section, and establishes best practices for implementing the manual review system.

## Research Areas

### 1. Database Schema Design for Manual Review Queue

**Decision**: Use a single `manual_review_queue` table with JSONB columns for layer results and soft-delete pattern

**Rationale**:
- **Soft delete pattern** (reviewed_at timestamp instead of hard delete) preserves full audit trail for compliance and debugging
- **JSONB for layer results** provides flexibility for evolving evaluation factors without schema migrations, enables JSON querying for factor breakdown UI
- **Single table** avoids complex joins - queue queries are simple `WHERE reviewed_at IS NULL` filters
- **Indexes on reviewed_at, queued_at, is_stale** ensure fast queue queries even at 10,000+ items

**Alternatives considered**:
- **Separate tables for layer results**: Rejected due to join complexity and no clear benefit (layer results are always fetched together)
- **Hard delete after review**: Rejected because audit trail is critical for understanding review patterns and debugging routing logic
- **Separate archived_reviews table**: Rejected as unnecessary complexity - single table with reviewed_at filter is simpler

**Schema outline**:
```sql
CREATE TABLE manual_review_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  url_id UUID NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
  confidence_band TEXT NOT NULL,
  confidence_score NUMERIC(3,2) NOT NULL,
  reasoning TEXT,
  sophistication_signals JSONB,
  layer1_results JSONB,  -- Domain analysis factors
  layer2_results JSONB,  -- Rule-based checks
  layer3_results JSONB,  -- LLM signals
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,  -- NULL = active queue item, NOT NULL = reviewed (soft-deleted)
  review_decision TEXT,  -- 'approved' or 'rejected'
  reviewer_notes TEXT,
  is_stale BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_manual_review_queue_active ON manual_review_queue(reviewed_at) WHERE reviewed_at IS NULL;
CREATE INDEX idx_manual_review_queue_stale ON manual_review_queue(is_stale, queued_at) WHERE reviewed_at IS NULL;
CREATE INDEX idx_manual_review_queue_job ON manual_review_queue(job_id);
```

### 2. Confidence Band Action Routing Architecture

**Decision**: Load confidence bands from settings at routing time, use action field to determine route

**Rationale**:
- **Runtime settings loading** ensures changes take effect immediately without redeployment
- **Action-based routing** (`auto_approve`, `manual_review`, `reject`) makes routing logic data-driven instead of hardcoded
- **Service-level caching** (settings cached for 5 minutes) balances freshness with database load
- **Explicit logging** of routing decisions creates audit trail for debugging and compliance

**Alternatives considered**:
- **Hardcoded band name logic** (current implementation): Rejected because it ignores user-configured actions and prevents flexible routing policies
- **Application-level config file**: Rejected because settings UI already stores this in database, file config would create inconsistency
- **Always query fresh settings**: Rejected due to database load - 5-minute cache is sufficient freshness for settings that change rarely

**Implementation pattern**:
```typescript
// In confidence-scoring.service.ts
async getConfidenceBandAction(score: number): Promise<{band: string, action: string}> {
  const bands = await this.settingsService.getConfidenceBands(); // Cached 5 min
  const matchingBand = bands.find(b => score >= b.min && score <= b.max);
  return { band: matchingBand.name, action: matchingBand.action };
}

// In manual-review-router.service.ts
async routeUrl(url: UrlEvaluation): Promise<void> {
  const {band, action} = await this.confidenceService.getConfidenceBandAction(url.score);

  this.logger.log(`URL ${url.id} routed: band=${band}, action=${action}, score=${url.score}`);

  switch(action) {
    case 'auto_approve': return this.finalizeResult(url, 'approved');
    case 'reject': return this.finalizeResult(url, 'rejected');
    case 'manual_review': return this.enqueueForReview(url);
  }
}
```

### 3. Queue Size Limiting Strategy

**Decision**: Check queue count before insertion, insert to url_results with status 'queue_overflow' if limit reached

**Rationale**:
- **Pre-insert count check** is efficient with `reviewed_at IS NULL` partial index (O(1) count)
- **Explicit 'queue_overflow' status** distinguishes capacity issues from quality issues, enabling better analytics and potential re-processing
- **Activity logging** of overflow events provides visibility for capacity planning
- **No blocking/waiting** - URLs that overflow are immediately finalized as rejected to avoid blocking job progress

**Alternatives considered**:
- **Queue URLs anyway with 'overflow' flag**: Rejected because this defeats the purpose of size limiting - queue would still grow unbounded
- **Wait/retry logic**: Rejected because blocking job workers waiting for queue capacity would cause cascading delays
- **Separate overflow queue**: Rejected as unnecessary complexity - url_results table with distinct status is sufficient

**Implementation pattern**:
```typescript
async enqueueForReview(url: UrlEvaluation): Promise<void> {
  const settings = await this.settingsService.getManualReviewSettings();

  if (settings.queue_size_limit !== null) {
    const currentCount = await this.countActiveQueue();

    if (currentCount >= settings.queue_size_limit) {
      await this.urlResultsRepo.insert({
        url_id: url.id,
        status: 'queue_overflow',
        reason: 'Manual review queue full',
        confidence_score: url.score
      });
      await this.activityLogService.log({
        type: 'queue_overflow',
        url_id: url.id,
        details: { queue_size: currentCount, limit: settings.queue_size_limit }
      });
      return; // Don't queue
    }
  }

  // Queue has space
  await this.manualReviewQueueRepo.insert({...});
}
```

### 4. Stale Queue Management with Scheduled Jobs

**Decision**: Daily BullMQ cron job queries for stale items and batch-updates is_stale flag

**Rationale**:
- **Daily schedule** is sufficient granularity - stale threshold is measured in days (e.g., 7 days), hourly checks are unnecessary
- **Batch update** (single UPDATE query with WHERE clause) is efficient for flagging multiple items
- **BullMQ cron job** integrates with existing job infrastructure, no new scheduling system needed
- **Idempotent operation** - re-running the job doesn't create duplicate activity logs (check is_stale=false in WHERE clause)

**Alternatives considered**:
- **Real-time stale checking on queue fetch**: Rejected due to performance overhead - running stale calculation on every queue query is wasteful
- **Separate stale_queue table**: Rejected as unnecessary normalization - single boolean flag is simpler
- **Hourly cron job**: Rejected as over-engineering - daily is sufficient for a threshold measured in days

**Implementation pattern**:
```typescript
// In apps/api/src/jobs/processors/stale-queue-marker.processor.ts
@Processor('stale-queue-marker')
export class StaleQueueMarkerProcessor {
  @Cron('0 2 * * *') // Daily at 2 AM
  async flagStaleItems() {
    const settings = await this.settingsService.getManualReviewSettings();

    if (!settings.auto_review_timeout_days) {
      return; // Stale-flagging disabled
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - settings.auto_review_timeout_days);

    const staleItems = await this.manualReviewQueueRepo
      .createQueryBuilder()
      .update()
      .set({ is_stale: true })
      .where('reviewed_at IS NULL')
      .andWhere('is_stale = false')
      .andWhere('queued_at < :cutoff', { cutoff: cutoffDate })
      .returning('*')
      .execute();

    // Log each flagged item
    for (const item of staleItems.raw) {
      await this.activityLogService.log({
        type: 'queue_item_stale',
        url_id: item.url_id,
        details: { queued_at: item.queued_at, days_in_queue: daysSince(item.queued_at) }
      });
    }

    this.logger.log(`Flagged ${staleItems.raw.length} items as stale`);
  }
}
```

### 5. Email Notification Implementation

**Decision**: Use existing notification service with threshold-tracking in Redis

**Rationale**:
- **Redis for state tracking** (last_email_sent timestamp) prevents duplicate emails when threshold is crossed multiple times
- **Non-blocking async sending** ensures URL processing continues even if email service is down
- **Error logging with retry** (3 retries with exponential backoff) handles transient failures gracefully
- **Email validation** at settings save time (class-validator) prevents invalid recipients from being stored

**Alternatives considered**:
- **Database for threshold tracking**: Rejected due to unnecessary load - Redis is already used for caching, reuse it for lightweight state
- **Blocking email send**: Rejected because email service failure should not block critical URL processing
- **No retry logic**: Rejected because network blips are common, simple retry with backoff is standard practice

**Implementation pattern**:
```typescript
// In apps/api/src/manual-review/services/notification.service.ts
async checkAndSendEmail(queueCount: number): Promise<void> {
  const settings = await this.settingsService.getManualReviewSettings();

  if (!settings.notifications?.email_threshold || !settings.notifications?.email_recipient) {
    return; // Email notifications disabled or not configured
  }

  if (queueCount < settings.notifications.email_threshold) {
    return; // Threshold not reached
  }

  // Check if we already sent email for this threshold crossing
  const lastSent = await this.redis.get('manual_review:last_email_threshold');
  const lastCount = parseInt(lastSent || '0', 10);

  if (lastCount >= settings.notifications.email_threshold && queueCount >= settings.notifications.email_threshold) {
    return; // Already sent, still above threshold
  }

  // Send email
  try {
    await this.emailService.send({
      to: settings.notifications.email_recipient,
      subject: `Manual Review Queue Alert: ${queueCount} items pending`,
      body: `The manual review queue has reached ${queueCount} items. Please review: ${process.env.WEB_URL}/manual-review`
    });

    await this.redis.set('manual_review:last_email_threshold', queueCount.toString());
  } catch (error) {
    this.logger.error('Failed to send email notification', error);
    // Don't throw - notification failure should not block processing
  }
}
```

### 6. Factor Breakdown UI Architecture

**Decision**: Structured layer results stored as JSONB, frontend renders with visual indicators per factor

**Rationale**:
- **JSONB storage** provides flexibility for evolving factors without schema migrations
- **Complete factor results** (all checks, not just triggered ones) enable comprehensive audit and debugging
- **Boolean indicators** for each factor (true = detected/triggered, false = checked but not detected) enable clear visual UI
- **Component-based rendering** (separate FactorBreakdown component) promotes reusability and testability

**Layer result structure**:
```typescript
// Layer 1: Domain analysis
interface Layer1Results {
  domain_age: { checked: boolean; passed: boolean; value?: number; threshold?: number; };
  tld_type: { checked: boolean; passed: boolean; value?: string; red_flags?: string[]; };
  registrar_reputation: { checked: boolean; passed: boolean; value?: string; };
  whois_privacy: { checked: boolean; passed: boolean; enabled?: boolean; };
  // ... other Layer 1 factors
}

// Layer 2: Rule-based checks
interface Layer2Results {
  guest_post_red_flags: {
    contact_page: { checked: boolean; detected: boolean; };
    author_bio: { checked: boolean; detected: boolean; };
    pricing_page: { checked: boolean; detected: boolean; };
    // ... other red flags
  };
  content_quality: {
    thin_content: { checked: boolean; detected: boolean; word_count?: number; };
    // ... other quality checks
  };
}

// Layer 3: LLM sophistication signals
interface Layer3Results {
  design_quality: { score: number; detected: boolean; reasoning?: string; };
  content_originality: { score: number; detected: boolean; reasoning?: string; };
  authority_indicators: { score: number; detected: boolean; reasoning?: string; };
  // ... other sophistication signals
}
```

**UI Component pattern**:
```tsx
// apps/web/components/FactorBreakdown.tsx
export function FactorBreakdown({ layer1, layer2, layer3 }: Props) {
  return (
    <div className="factor-breakdown">
      <Section title="Layer 1: Domain Analysis">
        <Factor
          name="Domain Age"
          checked={layer1.domain_age.checked}
          passed={layer1.domain_age.passed}
          details={layer1.domain_age.value ? `${layer1.domain_age.value} days` : undefined}
        />
        {/* ... other Layer 1 factors */}
      </Section>

      <Section title="Layer 2: Guest Post Red Flags">
        <Factor
          name="Contact Page"
          checked={layer2.guest_post_red_flags.contact_page.checked}
          detected={layer2.guest_post_red_flags.contact_page.detected}
          icon={layer2.guest_post_red_flags.contact_page.detected ? "✓" : "✗"}
        />
        {/* ... other Layer 2 factors */}
      </Section>

      <Section title="Layer 3: Sophistication Signals">
        <Factor
          name="Design Quality"
          score={layer3.design_quality.score}
          detected={layer3.design_quality.detected}
          reasoning={layer3.design_quality.reasoning}
        />
        {/* ... other Layer 3 factors */}
      </Section>
    </div>
  );
}
```

**Alternatives considered**:
- **Store only triggered factors**: Rejected because knowing which checks ran but didn't trigger is valuable for debugging false negatives
- **Separate database tables per layer**: Rejected due to join complexity and no clear benefit
- **Flat structure instead of nested**: Rejected because hierarchical structure (layer -> category -> factor) matches mental model and UI organization

## Technology Decisions

### Email Service Integration

**Decision**: Use nodemailer with SMTP configuration from environment variables

**Rationale**:
- **nodemailer** is the de facto standard for Node.js email (mature, well-documented, widely used)
- **SMTP configuration** (vs. API-based services like SendGrid) provides flexibility to use any email provider without vendor lock-in
- **Environment variables** for credentials follows 12-factor app principles

**Required environment variables**:
```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@example.com
SMTP_PASSWORD=secret
SMTP_FROM=noreply@example.com
```

### Slack Integration

**Decision**: Use @slack/webhook for posting messages to Slack channels

**Rationale**:
- **Official Slack SDK** is maintained by Slack, ensures compatibility with webhook API
- **Webhooks** are simpler than full Slack app (no OAuth, no complex permissions) - sufficient for one-way notifications
- **Single webhook URL** stored in settings simplifies configuration

**Implementation**:
```typescript
import { IncomingWebhook } from '@slack/webhook';

async sendSlackNotification(queueCount: number): Promise<void> {
  const settings = await this.settingsService.getManualReviewSettings();

  if (!settings.notifications?.slack_webhook_url) {
    return; // Slack disabled
  }

  const webhook = new IncomingWebhook(settings.notifications.slack_webhook_url);

  try {
    await webhook.send({
      text: `Manual Review Queue Alert: ${queueCount} items pending`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Manual Review Queue Alert*\n${queueCount} items pending review.`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Review Queue' },
              url: `${process.env.WEB_URL}/manual-review`
            }
          ]
        }
      ]
    });
  } catch (error) {
    this.logger.error('Failed to send Slack notification', error);
    // Don't throw - notification failure should not block processing
  }
}
```

## Best Practices Applied

### Database Query Performance

**Index strategy**:
- **Partial index on reviewed_at** (`WHERE reviewed_at IS NULL`) optimizes active queue queries
- **Composite index on (is_stale, queued_at)** optimizes stale item filtering and sorting
- **Job cascade deletion** (`ON DELETE CASCADE`) automatically cleans up queue items when jobs are deleted

### Error Handling

**Notification failures**:
- All notification sends wrapped in try-catch with logging
- Failures logged but not thrown - processing continues
- 3 retries with exponential backoff for transient failures

**Queue operations**:
- Transaction wrapping for multi-step operations (e.g., insert to url_results + log activity)
- Rollback on failure to maintain consistency
- Clear error messages logged with context (URL ID, job ID, queue size)

### Testing Strategy

**Unit tests**:
- Confidence band action routing logic (mock settings service)
- Queue size limit enforcement (mock repository count)
- Stale flagging date calculation

**Integration tests**:
- Full queue workflow: enqueue → fetch → review → verify finalization
- Notification sending with mock SMTP/Slack services
- Database constraint enforcement (foreign keys, NOT NULL)

**E2E tests**:
- Create job with medium-confidence URLs → verify queue population → approve URL → verify final results
- Dashboard badge count reflects queue size
- Factor breakdown UI displays all layers correctly

## Summary

All technical unknowns have been resolved:

1. ✅ **Database schema**: Single table with JSONB columns, soft-delete pattern, optimized indexes
2. ✅ **Routing architecture**: Runtime settings loading, action-based routing, caching for performance
3. ✅ **Queue limiting**: Pre-insert count check, explicit overflow status, activity logging
4. ✅ **Stale management**: Daily cron job, batch updates, idempotent operation
5. ✅ **Email notifications**: nodemailer with SMTP, Redis threshold tracking, non-blocking async
6. ✅ **Slack integration**: Official @slack/webhook, simple configuration, error handling
7. ✅ **Factor breakdown**: Structured JSONB storage, complete factor results, component-based UI

No blockers remain for Phase 1 design artifacts.
