# url_results Table Schema

**Final schema after all Phase 1 migrations (T001-T006)**

## Table: url_results

### Complete Column List (22 columns)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **Identity & References** |
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | Primary key |
| `url_id` | UUID | NOT NULL | - | Foreign key to job_urls(id) |
| `job_id` | UUID | NOT NULL | - | Foreign key to jobs(id) |
| `url` | TEXT | NOT NULL | - | URL string |
| **Status & Results** |
| `status` | TEXT | NOT NULL | - | Current status (approved, rejected, pending, processing, failed, timeout, queue_overflow) |
| `confidence_score` | NUMERIC(3,2) | NULL | - | Confidence score (0.00-1.00) |
| `confidence_band` | TEXT | NULL | - | Confidence band classification |
| `reviewer_notes` | TEXT | NULL | - | Notes from reviewer or system |
| **Layer Analysis (JSONB)** |
| `layer1_factors` | JSONB | NULL | NULL | Layer 1 domain analysis results |
| `layer2_factors` | JSONB | NULL | NULL | Layer 2 publication detection results |
| `layer3_factors` | JSONB | NULL | NULL | Layer 3 sophistication analysis results |
| **Retry Tracking** |
| `retry_count` | INTEGER | NOT NULL | 0 | Number of retry attempts (0-3) |
| `last_error` | TEXT | NULL | NULL | Last error message for debugging |
| `last_retry_at` | TIMESTAMPTZ | NULL | NULL | Timestamp of last retry attempt |
| **Core Tracking** |
| `eliminated_at_layer` | TEXT | NULL | NULL | Which layer eliminated this URL (layer1, layer2, layer3, passed_all) |
| `processing_time_ms` | INTEGER | NULL | 0 | Total processing time across all layers (ms) |
| `total_cost` | NUMERIC(10,8) | NULL | 0.00000000 | Total cost in USD (scraping + LLM) |
| **Timestamps** |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | NOW() | Last update timestamp (auto-updated via trigger) |

---

## Indexes (11 total)

### B-tree Indexes (6)

| Index Name | Columns | Type | Purpose |
|------------|---------|------|---------|
| `idx_url_results_url_id` | `(url_id)` | Standard | Foreign key lookups |
| `idx_url_results_job_id` | `(job_id)` | Standard | Foreign key lookups |
| `idx_url_results_status` | `(status)` | Standard | Filter by status |
| `idx_url_results_eliminated_at_layer` | `(eliminated_at_layer)` WHERE `eliminated_at_layer IS NOT NULL` | Partial | Pipeline funnel analytics |
| `idx_url_results_confidence_score` | `(confidence_score DESC NULLS LAST)` WHERE `confidence_score IS NOT NULL` | Partial | Confidence filtering/sorting |
| `idx_url_results_job_id_processed_at` | `(job_id, updated_at DESC)` | Composite | Job result pagination (most common query) |

### GIN Indexes (3)

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `idx_url_results_layer1_factors` | `(layer1_factors)` | JSONB containment queries (e.g., `@>`, `?`) |
| `idx_url_results_layer2_factors` | `(layer2_factors)` | JSONB containment queries |
| `idx_url_results_layer3_factors` | `(layer3_factors)` | JSONB containment queries |

---

## Constraints (6 total)

| Constraint Name | Type | Definition |
|-----------------|------|------------|
| `url_results_pkey` | PRIMARY KEY | `(id)` |
| `fk_url_results_job` | FOREIGN KEY | `job_id → jobs(id)` ON DELETE CASCADE |
| `fk_url_results_url` | FOREIGN KEY | `url_id → job_urls(id)` ON DELETE CASCADE |
| `url_results_status_check` | CHECK | `status IN ('approved', 'rejected', 'queue_overflow', 'pending', 'processing', 'failed', 'timeout')` |
| `url_results_retry_count_check` | CHECK | `retry_count >= 0 AND retry_count <= 3` |
| `url_results_eliminated_at_layer_check` | CHECK | `eliminated_at_layer IN ('layer1', 'layer2', 'layer3', 'passed_all')` |

---

## Triggers (1)

| Trigger Name | Event | Function |
|--------------|-------|----------|
| `trigger_update_url_results_updated_at` | BEFORE UPDATE | `update_url_results_updated_at()` - Auto-updates `updated_at` column |

---

## Row Level Security (RLS)

**Enabled:** Yes

### Policies

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| "Allow authenticated users to read url_results" | SELECT | authenticated | USING (true) |
| "Allow authenticated users to insert url_results" | INSERT | authenticated | WITH CHECK (true) |
| "Allow authenticated users to update url_results" | UPDATE | authenticated | USING (true) WITH CHECK (true) |
| "Allow service role full access to url_results" | ALL | service_role | USING (true) WITH CHECK (true) |

---

## JSONB Column Schemas

### layer1_factors (JSONB)

```typescript
{
  tld_type: string;                    // e.g., "gtld", "cctld", "new_gtld"
  domain_classification: string;       // e.g., "accept", "reject", "review"
  pattern_matches: string[];           // Array of matched patterns
  target_profile: string;              // e.g., "reputable_publication"
  reasoning: string;                   // Human-readable explanation
  passed: boolean;                     // true = passed Layer 1
}
```

### layer2_factors (JSONB)

```typescript
{
  publication_score: number;           // 0-100 score
  module_scores: {
    rss_feed_score: number;
    author_profile_score: number;
    content_freshness_score: number;
    site_structure_score: number;
  };
  keywords_found: string[];            // Matched keywords
  ad_networks_detected: string[];      // Detected ad networks
  content_signals: {
    has_bylines: boolean;
    has_categories: boolean;
    has_publishing_dates: boolean;
  };
  reasoning: string;                   // Human-readable explanation
  passed: boolean;                     // true = passed Layer 2
}
```

### layer3_factors (JSONB)

```typescript
{
  classification: string;              // e.g., "accepted", "rejected", "review"
  sophistication_signals: {
    design_quality: string;            // "high", "medium", "low"
    content_originality: string;       // "high", "medium", "low"
    editorial_standards: string;       // "high", "medium", "low"
  };
  llm_provider: string;                // e.g., "openai", "anthropic"
  model_version: string;               // e.g., "gpt-4", "claude-3"
  cost_usd: number;                    // Cost for this LLM call
  reasoning: string;                   // LLM explanation
  tokens_used: number;                 // Total tokens consumed
  processing_time_ms: number;          // Layer 3 processing time
}
```

---

## Common Query Patterns

### Get latest results for a job (paginated)

```sql
-- Uses idx_url_results_job_id_processed_at (composite index)
SELECT *
FROM url_results
WHERE job_id = $1
ORDER BY updated_at DESC
LIMIT 50 OFFSET $2;
```

### Filter by elimination layer (pipeline analytics)

```sql
-- Uses idx_url_results_eliminated_at_layer (partial index)
SELECT eliminated_at_layer, COUNT(*) as count
FROM url_results
WHERE job_id = $1
GROUP BY eliminated_at_layer;
```

### Filter by confidence score

```sql
-- Uses idx_url_results_confidence_score (partial index, DESC)
SELECT *
FROM url_results
WHERE confidence_score > 0.8
ORDER BY confidence_score DESC;
```

### JSONB containment queries

```sql
-- Uses idx_url_results_layer1_factors (GIN index)
SELECT *
FROM url_results
WHERE layer1_factors @> '{"passed": true}';

-- Uses idx_url_results_layer2_factors (GIN index)
SELECT *
FROM url_results
WHERE layer2_factors ? 'publication_score'
  AND (layer2_factors->>'publication_score')::int > 70;

-- Uses idx_url_results_layer3_factors (GIN index)
SELECT *
FROM url_results
WHERE layer3_factors @> '{"classification": "accepted"}';
```

### Filter by status

```sql
-- Uses idx_url_results_status (standard index)
SELECT *
FROM url_results
WHERE status = 'approved'
  AND job_id = $1;
```

---

## Migration Order

These migrations build the complete schema:

```
20251112000000_create_url_results_table.sql        # Base table + core columns
20251113000001_add_layer_factors.sql               # JSONB columns (T001)
20251113000002_add_jsonb_indexes.sql               # GIN indexes (T002)
20251113000003_add_retry_tracking.sql              # Retry columns (T003)
20251113000005_add_core_tracking_columns.sql       # Core tracking columns
20251113000006_add_filter_indexes.sql              # Filter indexes
```

---

## Index Size Estimates

For a table with **100,000 rows**:

| Index Type | Approximate Overhead |
|------------|---------------------|
| B-tree indexes (6) | ~5% of indexed column data |
| GIN indexes (3) | ~10% of JSONB column data |
| **Total** | ~7-8% of total table size |

**Example:** For a 100k row table with 500 MB data:
- B-tree indexes: ~15 MB
- GIN indexes: ~25 MB
- **Total index size:** ~40 MB

---

## Performance Expectations

| Query Type | Expected Performance (100k rows) |
|------------|----------------------------------|
| Foreign key lookups (url_id, job_id) | <10ms |
| Status filtering | <50ms |
| Confidence filtering/sorting | <100ms |
| Job result pagination | <50ms |
| JSONB containment queries | <500ms |
| Pipeline analytics (GROUP BY) | <200ms |

---

## Notes

1. **Idempotency:** All migrations use `IF NOT EXISTS` for safe re-execution
2. **Cascade Deletes:** Deleting a job or job_url will cascade delete related url_results
3. **Auto-update:** The `updated_at` column is automatically updated via trigger
4. **Partial Indexes:** Some indexes only index non-NULL values to minimize overhead
5. **DESC Ordering:** Confidence score index uses DESC for efficient "top N" queries
6. **NULLS LAST:** Confidence score index puts NULL values last in sort order
