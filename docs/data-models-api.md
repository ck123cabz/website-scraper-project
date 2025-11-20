# Data Models - API Backend

**Part:** API Backend (`apps/api/`)
**Database:** PostgreSQL (via Supabase)
**Last Updated:** 2025-01-18

---

## Overview

The API backend uses PostgreSQL with Supabase as the database provider. The schema is designed to support batch URL processing with a three-layer evaluation pipeline, leveraging JSONB columns for flexible factor storage.

**Key Design Decisions:**
- **JSONB Storage:** Layer 1/2/3 factors stored as JSONB for flexible schema evolution
- **Foreign Key Cascades:** CASCADE deletes ensure referential integrity
- **GIN Indexes:** High-performance JSONB querying for factor-based filtering
- **Row-Level Security (RLS):** Enabled for all tables with service role bypass
- **Timestamps:** Auto-updating `updated_at` triggers on all tables

---

## Table of Contents

1. [Core Tables](#core-tables)
2. [JSONB Factor Structures](#jsonb-factor-structures)
3. [Indexes & Performance](#indexes--performance)
4. [Relationships & Constraints](#relationships--constraints)
5. [Migration History](#migration-history)

---

## Core Tables

### 1. `jobs` Table

Stores batch processing job metadata.

**Schema:**
```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'paused', 'completed', 'failed', 'cancelled')),
  total_urls INTEGER DEFAULT 0,
  processed_urls INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,              -- Added: T063 (job archival)
  is_archived BOOLEAN DEFAULT FALSE     -- Added: T063 (job archival)
);
```

**Columns:**
- `id`: Unique job identifier (UUID v4)
- `name`: User-provided job name (default: "Untitled Job")
- `status`: Current job state
  - `pending`: Created, not yet started
  - `processing`: Active URL processing
  - `paused`: User-paused
  - `completed`: All URLs processed
  - `failed`: Fatal error occurred
  - `cancelled`: User-cancelled
- `total_urls`: Total URLs in job
- `processed_urls`: Count of completed URLs (updated by workers)
- `created_at`: Job creation timestamp
- `started_at`: When processing began (NULL until start)
- `completed_at`: When job finished (NULL until complete)
- `archived_at`: When job was archived (NULL if not archived)
- `is_archived`: Archival flag for soft delete pattern

**Indexes:**
- `PRIMARY KEY (id)`
- `CREATE INDEX idx_jobs_status ON jobs(status)`
- `CREATE INDEX idx_jobs_created_at ON jobs(created_at)`
- `CREATE INDEX idx_jobs_archived ON jobs(is_archived, archived_at)`

---

### 2. `job_urls` Table

Junction table linking jobs to URLs.

**Schema:**
```sql
CREATE TABLE job_urls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Columns:**
- `id`: Unique URL entry identifier
- `job_id`: Foreign key to `jobs` table
- `url`: Normalized URL string
- `created_at`: When URL was added to job

**Indexes:**
- `PRIMARY KEY (id)`
- `CREATE INDEX idx_job_urls_job_id ON job_urls(job_id)`

**Purpose:**
- Stores original URLs submitted with job
- Enables job-URL relationship tracking
- CASCADE delete removes URLs when job is deleted

---

### 3. `url_results` Table

Stores processing results with Layer 1/2/3 analysis factors.

**Schema:**
```sql
CREATE TABLE url_results (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  url_id UUID NOT NULL REFERENCES job_urls(id) ON DELETE CASCADE,
  url TEXT NOT NULL,

  -- Processing status
  current_layer TEXT,  -- 'layer1', 'layer2', 'layer3'
  layer1_status TEXT,  -- 'pass', 'reject'
  layer2_status TEXT,  -- 'pass', 'reject', NULL (if didn't reach Layer 2)
  layer3_classification TEXT,  -- 'approved', 'rejected', NULL (if didn't reach Layer 3)

  -- Confidence scoring
  confidence_band TEXT,  -- 'high', 'medium', 'low', 'very-high', 'very-low', 'auto_reject'
  confidence_score NUMERIC(3,2),  -- 0.00 to 1.00

  -- JSONB factor columns (added: 20251113000001)
  layer1_factors JSONB DEFAULT NULL,
  layer2_factors JSONB DEFAULT NULL,
  layer3_factors JSONB DEFAULT NULL,

  -- Performance metrics
  layer1_processing_time_ms INTEGER,
  layer2_processing_time_ms INTEGER,
  layer3_processing_time_ms INTEGER,
  total_processing_time_ms INTEGER,

  -- Cost tracking
  layer2_scraping_cost NUMERIC(10,4),  -- ScrapingBee cost
  layer3_total_cost NUMERIC(10,4),     -- Scraping + LLM cost

  -- Error handling (added: 20251113000003)
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Key Columns:**
- `current_layer`: Furthest layer reached before rejection or completion
- `layer1/2/3_status`: Pass/reject decision at each layer
- `layer1/2/3_factors`: JSONB columns storing detailed analysis factors (see [JSONB Structures](#jsonb-factor-structures))
- `layer1/2/3_processing_time_ms`: Per-layer timing metrics
- `layer2/3_cost`: Cost tracking for ScrapingBee and LLM API calls
- `retry_count`: Number of retry attempts (max 3)
- `last_error`: Last error message if processing failed

**Indexes:**
- `PRIMARY KEY (id)`
- `CREATE INDEX idx_url_results_job_id ON url_results(job_id)`
- `CREATE INDEX idx_url_results_url_id ON url_results(url_id)`
- `CREATE INDEX idx_url_results_url ON url_results(url)`
- `CREATE INDEX idx_url_results_layer3_classification ON url_results(layer3_classification)`
- `CREATE INDEX idx_url_results_confidence_band ON url_results(confidence_band)`
- `CREATE INDEX idx_url_results_current_layer ON url_results(current_layer)`
- `CREATE GIN INDEX idx_url_results_layer1_factors ON url_results USING GIN (layer1_factors)`
- `CREATE GIN INDEX idx_url_results_layer2_factors ON url_results USING GIN (layer2_factors)`
- `CREATE GIN INDEX idx_url_results_layer3_factors ON url_results USING GIN (layer3_factors)`

**Filter Indexes (added: 20251113000006):**
```sql
-- Composite index for common filter combinations
CREATE INDEX idx_url_results_filters ON url_results(
  job_id,
  layer3_classification,
  confidence_band,
  current_layer
);
```

---

### 4. `classification_settings` Table

Stores Layer 1/2/3 rules and thresholds.

**Schema:**
```sql
CREATE TABLE classification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  layer1_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  layer2_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  layer3_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**JSONB Structures:**

**layer1_rules:**
```json
{
  "url_pattern_exclusions": [
    {
      "id": "rule-1",
      "pattern": "blog\\.example\\.com",
      "category": "blog_platform",
      "enabled": true,
      "description": "WordPress.com hosted blogs"
    }
  ]
}
```

**layer2_rules:**
```json
{
  "blog_freshness_threshold_days": 90,
  "minimum_about_page_length": 100,
  "required_company_pages": ["about", "contact"]
}
```

**layer3_rules:**
```json
{
  "confidence_thresholds": {
    "high": 0.85,
    "medium": 0.65,
    "low": 0.45
  },
  "auto_reject_threshold": 0.30,
  "prompts": {
    "classification_system": "You are an expert...",
    "classification_user": "Analyze this website..."
  }
}
```

**Indexes:**
- `PRIMARY KEY (id)`

**Note:** Typically one row exists (singleton pattern). Service loads settings on startup and caches for 5 minutes.

---

### 5. `activity_log` Table (Optional)

Audit trail for user actions and system events.

**Schema:**
```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  action TEXT NOT NULL,  -- 'job_created', 'job_paused', 'job_resumed', 'settings_updated'
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Usage:** Tracks job lifecycle events and settings changes for audit purposes.

---

## JSONB Factor Structures

### Layer 1 Factors (`layer1_factors` column)

Domain-based analysis results.

**Structure:**
```json
{
  "matched_patterns": ["blog.example.com", "/author/"],
  "domain_category": "corporate_blog",
  "url_structure_score": 0.8,
  "rejection_reasons": ["Subdomain blog platform"],
  "tld_type": "com",
  "domain_classification": "commercial",
  "target_profile": "corporate",
  "reasoning": "Domain matches blog platform pattern",
  "passed": false
}
```

**Key Fields:**
- `matched_patterns`: Array of matched exclusion patterns
- `domain_category`: Classification (corporate, blog, news, etc.)
- `url_structure_score`: 0.0-1.0 quality score
- `passed`: Boolean pass/reject decision

---

### Layer 2 Factors (`layer2_factors` column)

Operational signals from homepage scraping.

**Structure:**
```json
{
  "has_about_page": true,
  "has_contact_page": true,
  "has_team_page": false,
  "recent_post_count": 12,
  "last_post_date": "2025-01-15",
  "blog_freshness_days": 3,
  "detected_cms": "WordPress",
  "tech_stack": ["React", "Node.js"],
  "publication_score": 0.75,
  "module_scores": {
    "about_page": 1.0,
    "contact_page": 1.0,
    "blog_freshness": 0.9
  },
  "keywords_found": ["guest post", "write for us"],
  "ad_networks_detected": [],
  "content_signals": ["high_quality_content", "active_blog"],
  "reasoning": "Site has active blog and company pages",
  "passed": true
}
```

**Key Fields:**
- `has_*_page`: Boolean presence checks for About/Contact/Team pages
- `recent_post_count`: Blog posts in last 90 days
- `blog_freshness_days`: Days since last post
- `detected_cms`: Content management system detected (WordPress, Custom, etc.)
- `publication_score`: 0.0-1.0 overall publication quality score

---

### Layer 3 Factors (`layer3_factors` column)

AI-powered sophistication analysis.

**Structure:**
```json
{
  "classification": "approved",
  "llm_provider": "gemini",
  "model_version": "gemini-1.5-flash",
  "classification_reasoning": "Site focuses on industry news with clear guest posting guidelines. Content quality is high with regular updates.",
  "content_quality_score": 0.85,
  "sophistication_signals": [
    "professional_design",
    "high_authority_backlinks",
    "active_community"
  ],
  "relevance_indicators": [
    "guest post guidelines",
    "write for us page",
    "editorial calendar"
  ],
  "red_flags": [],
  "confidence_explanation": "Strong indicators of guest posting opportunity with minimal risk factors",
  "cost_usd": 0.0023,
  "tokens_used": 1250,
  "processing_time_ms": 2341
}
```

**Key Fields:**
- `classification`: "approved" or "rejected"
- `llm_provider`: "gemini" or "openai"
- `classification_reasoning`: Natural language explanation from LLM
- `content_quality_score`: 0.0-1.0 subjective quality rating
- `sophistication_signals`: Array of positive indicators
- `red_flags`: Array of negative indicators
- `cost_usd`: Total cost (scraping + LLM tokens)

---

## Indexes & Performance

### B-Tree Indexes (Standard Lookups)

```sql
-- Primary keys
CREATE INDEX idx_jobs_pk ON jobs(id);
CREATE INDEX idx_url_results_pk ON url_results(id);

-- Foreign keys
CREATE INDEX idx_url_results_job_id ON url_results(job_id);
CREATE INDEX idx_url_results_url_id ON url_results(url_id);

-- Filtering
CREATE INDEX idx_url_results_layer3_classification ON url_results(layer3_classification);
CREATE INDEX idx_url_results_confidence_band ON url_results(confidence_band);
CREATE INDEX idx_url_results_current_layer ON url_results(current_layer);

-- Composite filter index (multi-column queries)
CREATE INDEX idx_url_results_filters ON url_results(
  job_id, layer3_classification, confidence_band, current_layer
);
```

### GIN Indexes (JSONB Queries)

```sql
CREATE INDEX idx_url_results_layer1_factors USING GIN ON url_results(layer1_factors);
CREATE INDEX idx_url_results_layer2_factors USING GIN ON url_results(layer2_factors);
CREATE INDEX idx_url_results_layer3_factors USING GIN ON url_results(layer3_factors);
```

**Query Examples:**
```sql
-- Find results with specific Layer 2 factor
SELECT * FROM url_results
WHERE layer2_factors @> '{"has_contact_page": true}';

-- Find results matching multiple Layer 3 conditions
SELECT * FROM url_results
WHERE layer3_factors @> '{"llm_provider": "gemini"}'
  AND layer3_factors->>'classification' = 'approved';
```

---

## Relationships & Constraints

### Entity Relationship Diagram

```
jobs (1) ────< (N) job_urls
  │                    │
  │                    │
  └────< (N) url_results >────┘
```

### Foreign Key Cascades

```sql
-- url_results → jobs
CONSTRAINT fk_url_results_job
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE

-- url_results → job_urls
CONSTRAINT fk_url_results_url
  FOREIGN KEY (url_id) REFERENCES job_urls(id) ON DELETE CASCADE

-- job_urls → jobs
CONSTRAINT fk_job_urls_job
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
```

**Cascade Behavior:**
- Deleting a `job` cascades to all `job_urls` and `url_results`
- Deleting a `job_url` cascades to related `url_results`

### Check Constraints

```sql
-- jobs.status enum constraint
CHECK (status IN ('pending', 'processing', 'paused', 'completed', 'failed', 'cancelled'))

-- url_results.layer1_status enum constraint
CHECK (layer1_status IN ('pass', 'reject'))

-- url_results.confidence_score range constraint
CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00)
```

---

## Migration History

### Key Migrations

| Date | File | Purpose |
|------|------|---------|
| 2025-11-12 | `20251112000000_create_url_results_table.sql` | Initial `url_results` table creation |
| 2025-11-13 | `20251113000001_add_layer_factors.sql` | Add JSONB factor columns |
| 2025-11-13 | `20251113000002_add_jsonb_indexes.sql` | Create GIN indexes for JSONB columns |
| 2025-11-13 | `20251113000003_add_retry_tracking.sql` | Add retry_count and last_error columns |
| 2025-11-13 | `20251113000004_add_job_archival.sql` | Add archived_at and is_archived columns |
| 2025-11-13 | `20251113000006_add_filter_indexes.sql` | Add composite filter index |

### Migration Commands

```bash
# Apply migrations
cd supabase
supabase db push

# Create new migration
supabase migration new migration_name

# Reset database (development only)
supabase db reset
```

---

## Row-Level Security (RLS)

**Status:** Enabled on all tables

**Policies:**
- `authenticated` role: Read, insert, update access
- `service_role`: Full access (bypasses RLS)
- `anon` role: No access

**Example Policy:**
```sql
CREATE POLICY "Allow service role full access to url_results"
  ON url_results
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

**Note:** API uses `service_role` key, so RLS is effectively bypassed for backend operations.

---

## Data Retention & Cleanup

### Archival Strategy

**Jobs:**
- Completed jobs older than 90 days: Auto-archived (archived_at set, is_archived = true)
- Archived jobs older than 180 days: Hard-deleted
- Archival cron: Daily at 2:00 AM UTC

**Results:**
- Cascade-deleted when parent job is deleted
- No independent retention policy

### Cleanup Service

**Implementation:** `CleanupService` (cron job)

**Schedule:**
```typescript
@Cron('0 2 * * *')  // Daily at 2:00 AM UTC
async handleArchival() {
  // Archive completed jobs > 90 days
  // Hard-delete archived jobs > 180 days
}
```

---

## Performance Considerations

### Query Optimization

**Pagination Best Practices:**
```sql
-- Use LIMIT + OFFSET with ORDER BY
SELECT * FROM url_results
WHERE job_id = 'uuid'
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

**JSONB Querying:**
```sql
-- Use GIN index for containment queries
WHERE layer2_factors @> '{"has_contact_page": true}'

-- Use ->> for JSON field extraction (slower, no index support)
WHERE layer3_factors->>'llm_provider' = 'gemini'
```

### Connection Pooling

**Supabase Connection Limits:**
- Free tier: 60 concurrent connections
- Pro tier: 200 concurrent connections

**Best Practice:** Use connection pooling in application layer (handled by Supabase client).

---

## Related Documentation

- [Architecture - API Backend](./architecture-api.md)
- [API Contracts - API](./api-contracts-api.md)
- [Development Guide - API](./development-guide-api.md)
- [Integration Architecture](./integration-architecture.md)

---

**Document Version:** 1.0.0
**Generated:** 2025-01-18
**Last Updated:** 2025-01-18
