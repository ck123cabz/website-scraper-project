# Data Model: Manual Review System

**Feature**: Complete Settings Implementation (Manual Review System)
**Date**: 2025-11-11
**Status**: Phase 1 Design

## Overview

This document defines all entities, their fields, relationships, validation rules, and state transitions for the manual review system. All entities are stored in Supabase PostgreSQL unless otherwise noted.

## Core Entities

### 1. ManualReviewQueueEntry

**Table**: `manual_review_queue`

**Purpose**: Represents a URL awaiting manual review with complete evaluation results from all three processing layers.

**Lifecycle**:
- Created when URL is routed to manual review (confidence band action = 'manual_review')
- Updated when flagged as stale (is_stale = true)
- Soft-deleted when reviewed (reviewed_at set to timestamp)
- Retained indefinitely for audit trail

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| url | TEXT | NOT NULL | The URL being reviewed |
| job_id | UUID | NOT NULL, FOREIGN KEY → jobs(id) ON DELETE CASCADE | Parent job reference |
| url_id | UUID | NOT NULL, FOREIGN KEY → urls(id) ON DELETE CASCADE | URL entity reference |
| confidence_band | TEXT | NOT NULL | Band name (e.g., 'medium', 'low') |
| confidence_score | NUMERIC(3,2) | NOT NULL, CHECK (confidence_score >= 0 AND confidence_score <= 1) | Score from Layer 3 (0.00-1.00) |
| reasoning | TEXT | NULL | Layer 3 LLM reasoning for the confidence score |
| sophistication_signals | JSONB | NULL | Layer 3 sophistication analysis (design, content, authority) |
| layer1_results | JSONB | NOT NULL | Domain analysis evaluation results (see Layer1Results schema) |
| layer2_results | JSONB | NOT NULL | Rule-based checks evaluation results (see Layer2Results schema) |
| layer3_results | JSONB | NOT NULL | LLM sophistication signals evaluation results (see Layer3Results schema) |
| queued_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When URL was added to queue |
| reviewed_at | TIMESTAMPTZ | NULL | When URL was reviewed (NULL = active queue item) |
| review_decision | TEXT | NULL, CHECK (review_decision IN ('approved', 'rejected')) | User's decision |
| reviewer_notes | TEXT | NULL | Optional notes from reviewer |
| is_stale | BOOLEAN | NOT NULL, DEFAULT FALSE | Flagged as stale due to timeout |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes**:
```sql
CREATE INDEX idx_manual_review_queue_active
  ON manual_review_queue(reviewed_at)
  WHERE reviewed_at IS NULL;

CREATE INDEX idx_manual_review_queue_stale
  ON manual_review_queue(is_stale, queued_at)
  WHERE reviewed_at IS NULL;

CREATE INDEX idx_manual_review_queue_job
  ON manual_review_queue(job_id);
```

**Validation Rules**:
- `confidence_score` must be between 0.00 and 1.00
- `review_decision` can only be 'approved' or 'rejected' (not both, not other values)
- If `reviewed_at` is set, `review_decision` must also be set
- `layer1_results`, `layer2_results`, `layer3_results` must be valid JSONB (validated at application layer)

**State Transitions**:
```
[Created] → queued_at set, reviewed_at = NULL, is_stale = FALSE
    ↓
[Active Queue] → Waiting for review (WHERE reviewed_at IS NULL)
    ↓ (if timeout exceeded)
[Flagged Stale] → is_stale set to TRUE by daily cron job
    ↓
[Reviewed] → reviewed_at set, review_decision set (soft-delete)
    ↓
[Archived] → Retained in table for audit trail (filtered out of active queue views)
```

**Example Row**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "url": "https://example.com/guest-post",
  "job_id": "660e8400-e29b-41d4-a716-446655440000",
  "url_id": "770e8400-e29b-41d4-a716-446655440000",
  "confidence_band": "medium",
  "confidence_score": 0.67,
  "reasoning": "Moderate sophistication with some guest post indicators",
  "sophistication_signals": {
    "design_quality": 0.7,
    "content_originality": 0.6,
    "authority_indicators": 0.65
  },
  "layer1_results": {
    "domain_age": { "checked": true, "passed": true, "value": 365 },
    "tld_type": { "checked": true, "passed": false, "value": "info" }
  },
  "layer2_results": {
    "guest_post_red_flags": {
      "contact_page": { "checked": true, "detected": true },
      "author_bio": { "checked": true, "detected": false }
    }
  },
  "layer3_results": {
    "design_quality": { "score": 0.7, "detected": true, "reasoning": "Clean layout" },
    "content_originality": { "score": 0.6, "detected": true, "reasoning": "Mixed content" }
  },
  "queued_at": "2025-11-11T10:00:00Z",
  "reviewed_at": null,
  "review_decision": null,
  "reviewer_notes": null,
  "is_stale": false,
  "created_at": "2025-11-11T10:00:00Z",
  "updated_at": "2025-11-11T10:00:00Z"
}
```

---

### 2. Layer1Results (JSONB Schema)

**Purpose**: Structured evaluation results from Layer 1 domain analysis showing which domain factors were checked and their outcomes.

**Storage**: Stored as JSONB in `manual_review_queue.layer1_results`

**Schema**:
```typescript
interface Layer1Results {
  domain_age: {
    checked: boolean;
    passed: boolean;
    value?: number;        // Age in days
    threshold?: number;    // Minimum threshold configured
  };
  tld_type: {
    checked: boolean;
    passed: boolean;
    value?: string;        // Actual TLD (e.g., 'com', 'info')
    red_flags?: string[];  // TLDs flagged as suspicious
  };
  registrar_reputation: {
    checked: boolean;
    passed: boolean;
    value?: string;        // Registrar name
    red_flags?: string[];  // Registrars flagged as suspicious
  };
  whois_privacy: {
    checked: boolean;
    passed: boolean;
    enabled?: boolean;
  };
  ssl_certificate: {
    checked: boolean;
    passed: boolean;
    valid?: boolean;
    issuer?: string;
  };
}
```

**Validation**:
- All top-level keys must be present (domain_age, tld_type, registrar_reputation, whois_privacy, ssl_certificate)
- Each factor object must have `checked` (boolean) and `passed` (boolean)
- Optional fields depend on what was actually evaluated

---

### 3. Layer2Results (JSONB Schema)

**Purpose**: Structured evaluation results from Layer 2 rule-based checks showing which guest post indicators and content quality flags were detected.

**Storage**: Stored as JSONB in `manual_review_queue.layer2_results`

**Schema**:
```typescript
interface Layer2Results {
  guest_post_red_flags: {
    contact_page: { checked: boolean; detected: boolean; };
    author_bio: { checked: boolean; detected: boolean; };
    pricing_page: { checked: boolean; detected: boolean; };
    submit_content: { checked: boolean; detected: boolean; };
    write_for_us: { checked: boolean; detected: boolean; };
    guest_post_guidelines: { checked: boolean; detected: boolean; };
  };
  content_quality: {
    thin_content: {
      checked: boolean;
      detected: boolean;
      word_count?: number;
      threshold?: number;
    };
    excessive_ads: { checked: boolean; detected: boolean; };
    broken_links: {
      checked: boolean;
      detected: boolean;
      count?: number;
    };
  };
}
```

**Validation**:
- `guest_post_red_flags` must contain all 6 indicator keys
- `content_quality` must contain all 3 quality check keys
- Each factor object must have `checked` (boolean) and `detected` (boolean)

---

### 4. Layer3Results (JSONB Schema)

**Purpose**: Structured evaluation results from Layer 3 LLM analysis showing sophistication signals detected.

**Storage**: Stored as JSONB in `manual_review_queue.layer3_results`

**Schema**:
```typescript
interface Layer3Results {
  design_quality: {
    score: number;         // 0.0 - 1.0
    detected: boolean;     // Score above threshold
    reasoning?: string;    // LLM explanation
  };
  content_originality: {
    score: number;
    detected: boolean;
    reasoning?: string;
  };
  authority_indicators: {
    score: number;
    detected: boolean;
    reasoning?: string;
  };
  professional_presentation: {
    score: number;
    detected: boolean;
    reasoning?: string;
  };
}
```

**Validation**:
- All top-level keys must be present (design_quality, content_originality, authority_indicators, professional_presentation)
- `score` must be between 0.0 and 1.0
- `detected` is boolean
- `reasoning` is optional

---

### 5. UrlResult (Existing Table - Extended)

**Table**: `url_results`

**Purpose**: Final result for all processed URLs, including those from manual review. This is the existing table that will receive additional status values.

**New Status Values**:
- `approved` - Manually approved from queue
- `rejected` - Manually rejected from queue OR auto-rejected by confidence band action
- `queue_overflow` - Rejected due to manual review queue size limit

**Fields Added/Modified**:
- `status` - Add new enum values: 'approved', 'queue_overflow'
- `reviewer_notes` - TEXT (optional) - Notes from manual reviewer or overflow reason

**Relationships**:
- One-to-one with `urls` table
- Referenced by `manual_review_queue` via `url_id`

---

### 6. ConfidenceBand (Existing Settings)

**Table**: `confidence_bands` (part of `settings` JSONB)

**Purpose**: Defines score thresholds and routing actions for confidence-based URL routing.

**Storage**: JSONB array in `settings.confidence_bands`

**Schema**:
```typescript
interface ConfidenceBand {
  name: string;          // e.g., 'high', 'medium', 'low', 'auto_reject'
  min: number;           // Minimum score (inclusive) 0.0-1.0
  max: number;           // Maximum score (inclusive) 0.0-1.0
  action: 'auto_approve' | 'manual_review' | 'reject';
}
```

**Validation Rules**:
- `name` must be unique across all bands
- `min` and `max` must be between 0.0 and 1.0
- `min` must be <= `max`
- Ranges must not overlap (e.g., can't have two bands covering 0.5-0.7)
- All scores from 0.0 to 1.0 must be covered by exactly one band

**Example**:
```json
[
  { "name": "high", "min": 0.8, "max": 1.0, "action": "auto_approve" },
  { "name": "medium", "min": 0.5, "max": 0.79, "action": "manual_review" },
  { "name": "low", "min": 0.3, "max": 0.49, "action": "manual_review" },
  { "name": "auto_reject", "min": 0.0, "max": 0.29, "action": "reject" }
]
```

---

### 7. ManualReviewSettings (Existing Settings)

**Table**: `manual_review_settings` (or part of `settings` JSONB)

**Purpose**: Configuration for manual review queue behavior and notifications.

**Schema**:
```typescript
interface ManualReviewSettings {
  queue_size_limit: number | null;  // Max queue size, null = unlimited
  auto_review_timeout_days: number | null;  // Days before flagging as stale, null = disabled
  notifications: {
    email_threshold: number;       // Queue size to trigger email
    email_recipient: string;       // Validated email address
    slack_webhook_url: string | null;
    slack_threshold: number;       // Queue size to trigger Slack
    dashboard_badge: boolean;      // Show queue count on dashboard
  };
}
```

**Validation Rules**:
- `queue_size_limit` must be positive integer or null
- `auto_review_timeout_days` must be positive integer or null
- `notifications.email_threshold` must be positive integer
- `notifications.email_recipient` must be valid email format (validated by class-validator @IsEmail)
- `notifications.slack_webhook_url` must be valid URL format if provided
- `notifications.slack_threshold` must be positive integer

---

### 8. ReviewDecision (Request DTO)

**Purpose**: User's decision when reviewing a queued URL via API.

**Storage**: Not persisted as separate entity - fields are copied to `manual_review_queue` (review_decision, reviewer_notes) and `url_results` (status, reviewer_notes).

**Schema**:
```typescript
class ReviewDecisionDto {
  @IsIn(['approved', 'rejected'])
  decision: 'approved' | 'rejected';

  @IsString()
  @IsOptional()
  notes?: string;  // Optional notes for approval, required for rejection (enforced at service layer)
}
```

**Validation**:
- `decision` must be 'approved' or 'rejected'
- `notes` is optional for approval
- `notes` is required for rejection (business rule enforced at service layer, not DTO)

---

### 9. StaleQueueItem (Query View)

**Purpose**: Logical view of queue items flagged as stale.

**Storage**: Not a separate table - this is a filtered query of `manual_review_queue` WHERE `is_stale = TRUE AND reviewed_at IS NULL`.

**Query**:
```sql
SELECT *
FROM manual_review_queue
WHERE reviewed_at IS NULL
  AND is_stale = TRUE
ORDER BY queued_at ASC;
```

**Use Cases**:
- Manual review page "Stale Items" filter
- Dashboard metrics for queue health
- Activity log reporting

---

## Relationships

```
┌─────────────┐
│    jobs     │
└──────┬──────┘
       │
       │ 1:N (ON DELETE CASCADE)
       │
       ▼
┌─────────────────────────┐      1:1     ┌──────────────┐
│ manual_review_queue     │◄─────────────┤ url_results  │
│                         │              └──────────────┘
│ - layer1_results JSONB  │
│ - layer2_results JSONB  │
│ - layer3_results JSONB  │
└─────────────────────────┘
       ▲
       │ N:1 (reference)
       │
┌──────┴───────┐
│     urls     │
└──────────────┘
```

**Cascade Behavior**:
- Delete `jobs` → cascades to `manual_review_queue` (queue items for that job are removed)
- Delete `urls` → cascades to `manual_review_queue` (queue item for that URL is removed)
- Review queue item → inserts to `url_results`, soft-deletes queue entry (reviewed_at set)

---

## State Machine: Manual Review Lifecycle

```
                           [URL Processed]
                                  │
                                  ├─ Confidence band action = 'auto_approve'
                                  │  → Insert to url_results (status='approved')
                                  │
                                  ├─ Confidence band action = 'reject'
                                  │  → Insert to url_results (status='rejected')
                                  │
                                  └─ Confidence band action = 'manual_review'
                                     │
                                     ├─ Queue at size limit?
                                     │  YES → Insert to url_results (status='queue_overflow')
                                     │  NO  → Continue ↓
                                     │
                                     └─ Insert to manual_review_queue
                                        (reviewed_at = NULL, is_stale = FALSE)
                                        │
                                        │ [Active Queue]
                                        │
                                        ├─ Daily cron checks queued_at
                                        │  → If > timeout_days: is_stale = TRUE
                                        │
                                        │ [User Reviews]
                                        │
                                        ├─ Decision = 'approved'
                                        │  → Insert to url_results (status='approved', reviewer_notes)
                                        │  → Update manual_review_queue (reviewed_at = NOW(), review_decision='approved')
                                        │
                                        └─ Decision = 'rejected'
                                           → Insert to url_results (status='rejected', reviewer_notes)
                                           → Update manual_review_queue (reviewed_at = NOW(), review_decision='rejected')
```

---

## TypeScript Type Definitions

**Location**: `packages/shared/src/types/manual-review.ts`

```typescript
// Manual review queue entry
export interface ManualReviewQueueEntry {
  id: string;
  url: string;
  job_id: string;
  url_id: string;
  confidence_band: string;
  confidence_score: number;
  reasoning: string | null;
  sophistication_signals: Record<string, any> | null;
  layer1_results: Layer1Results;
  layer2_results: Layer2Results;
  layer3_results: Layer3Results;
  queued_at: Date;
  reviewed_at: Date | null;
  review_decision: 'approved' | 'rejected' | null;
  reviewer_notes: string | null;
  is_stale: boolean;
  created_at: Date;
  updated_at: Date;
}

// Layer evaluation result types
export interface Layer1Results {
  domain_age: FactorResult & { value?: number; threshold?: number };
  tld_type: FactorResult & { value?: string; red_flags?: string[] };
  registrar_reputation: FactorResult & { value?: string; red_flags?: string[] };
  whois_privacy: FactorResult & { enabled?: boolean };
  ssl_certificate: FactorResult & { valid?: boolean; issuer?: string };
}

export interface Layer2Results {
  guest_post_red_flags: {
    contact_page: RedFlagResult;
    author_bio: RedFlagResult;
    pricing_page: RedFlagResult;
    submit_content: RedFlagResult;
    write_for_us: RedFlagResult;
    guest_post_guidelines: RedFlagResult;
  };
  content_quality: {
    thin_content: RedFlagResult & { word_count?: number; threshold?: number };
    excessive_ads: RedFlagResult;
    broken_links: RedFlagResult & { count?: number };
  };
}

export interface Layer3Results {
  design_quality: SophisticationSignal;
  content_originality: SophisticationSignal;
  authority_indicators: SophisticationSignal;
  professional_presentation: SophisticationSignal;
}

// Helper types
interface FactorResult {
  checked: boolean;
  passed: boolean;
}

interface RedFlagResult {
  checked: boolean;
  detected: boolean;
}

interface SophisticationSignal {
  score: number;
  detected: boolean;
  reasoning?: string;
}

// Review decision
export interface ReviewDecision {
  decision: 'approved' | 'rejected';
  notes?: string;
}

// Confidence band configuration
export interface ConfidenceBand {
  name: string;
  min: number;
  max: number;
  action: 'auto_approve' | 'manual_review' | 'reject';
}

// Manual review settings
export interface ManualReviewSettings {
  queue_size_limit: number | null;
  auto_review_timeout_days: number | null;
  notifications: {
    email_threshold: number;
    email_recipient: string;
    slack_webhook_url: string | null;
    slack_threshold: number;
    dashboard_badge: boolean;
  };
}
```

---

## Migration Dependencies

**Required Migrations (in order)**:

1. **Add new enum values to url_results.status**:
   ```sql
   ALTER TABLE url_results
   ALTER COLUMN status TYPE TEXT; -- Convert enum to text if needed
   -- Add CHECK constraint: status IN ('pending', 'approved', 'rejected', 'queue_overflow', ...)
   ```

2. **Create manual_review_queue table** with all indexes and constraints

3. **Add reviewer_notes column to url_results** (if not exists):
   ```sql
   ALTER TABLE url_results ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;
   ```

**Rollback Plan**:
- Drop `manual_review_queue` table
- Remove 'queue_overflow' from url_results status check constraint
- Remove reviewer_notes column (only if added in this migration and no data exists)

---

## Summary

This data model provides:

✅ **Complete audit trail** - Soft-delete pattern preserves all review history
✅ **Flexible factor storage** - JSONB allows evolving evaluation logic without schema changes
✅ **Clear state transitions** - Explicit states (queued, stale, reviewed) with timestamps
✅ **Type safety** - Shared TypeScript types across API and frontend
✅ **Performance** - Indexes optimized for common queries (active queue, stale items)
✅ **Data integrity** - Foreign keys, check constraints, validation rules

All entities are ready for contract generation and implementation.
