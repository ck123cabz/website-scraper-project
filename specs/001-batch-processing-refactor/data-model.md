# Data Model: Batch Processing Workflow Refactor

**Date**: 2025-11-13
**Branch**: `001-batch-processing-refactor`

## Overview

This document defines the database schema changes required for the batch processing refactor. The primary change is enhancing `url_results` to store complete Layer 1/2/3 analysis factors in JSONB columns, enabling rich CSV exports and eliminating dependency on the manual review queue.

---

## Entity: url_results (Enhanced)

**Purpose**: Store complete URL processing results with full Layer 1/2/3 factor data

**Table**: `url_results`

### Schema Changes

**New columns (migration required):**

```sql
-- Add JSONB columns for layer factors
ALTER TABLE url_results ADD COLUMN layer1_factors JSONB;
ALTER TABLE url_results ADD COLUMN layer2_factors JSONB;
ALTER TABLE url_results ADD COLUMN layer3_factors JSONB;

-- Add retry tracking
ALTER TABLE url_results ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE url_results ADD COLUMN last_error TEXT;

-- Add GIN indexes for JSONB filtering
CREATE INDEX idx_url_results_layer1_factors ON url_results USING GIN (layer1_factors);
CREATE INDEX idx_url_results_layer2_factors ON url_results USING GIN (layer2_factors);
CREATE INDEX idx_url_results_layer3_factors ON url_results USING GIN (layer3_factors);

-- Add indexes for common filter columns
CREATE INDEX idx_url_results_eliminated_at_layer ON url_results (eliminated_at_layer);
CREATE INDEX idx_url_results_final_decision ON url_results (final_decision);
CREATE INDEX idx_url_results_confidence_score ON url_results (confidence_score);
CREATE INDEX idx_url_results_job_id_processed_at ON url_results (job_id, processed_at DESC);
```

### Complete Column Definitions

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| url | TEXT | NO | - | The URL being analyzed |
| job_id | UUID | NO | - | Foreign key to jobs table |
| final_decision | TEXT | NO | - | Final classification: 'accepted', 'rejected', 'error', 'pending_migration' |
| confidence_score | NUMERIC(4,3) | YES | NULL | Layer 3 confidence (0.000-1.000) |
| eliminated_at_layer | TEXT | YES | NULL | 'layer1', 'layer2', 'layer3', 'passed_all', NULL for errors |
| processing_time_ms | INTEGER | NO | 0 | Total processing time in milliseconds |
| total_cost | NUMERIC(10,8) | NO | 0.00000000 | Total cost in USD (Layer 3 LLM calls) |
| retry_count | INTEGER | NO | 0 | Number of retry attempts (max 3) |
| last_error | TEXT | YES | NULL | Last error message if retry needed |
| layer1_factors | JSONB | YES | NULL | Layer 1 domain analysis factors |
| layer2_factors | JSONB | YES | NULL | Layer 2 publication detection factors |
| layer3_factors | JSONB | YES | NULL | Layer 3 sophistication analysis factors |
| processed_at | TIMESTAMPTZ | NO | NOW() | When processing completed |
| created_at | TIMESTAMPTZ | NO | NOW() | When record created |
| updated_at | TIMESTAMPTZ | NO | NOW() | When record last updated |

### JSONB Column Structures

#### layer1_factors (Domain Analysis)

```typescript
interface Layer1Factors {
  tld_type: 'gtld' | 'cctld' | 'custom';
  tld_value: string; // e.g., '.com', '.uk', '.tech'
  domain_classification: 'commercial' | 'personal' | 'institutional' | 'spam';
  pattern_matches: string[]; // e.g., ['affiliate-link', 'url-shortener']
  target_profile: {
    type: string; // e.g., 'B2B software', 'e-commerce'
    confidence: number; // 0.0-1.0
  };
  reasoning: string; // Human-readable explanation
  passed: boolean; // Did URL pass Layer 1?
}
```

**Example:**
```json
{
  "tld_type": "gtld",
  "tld_value": ".com",
  "domain_classification": "commercial",
  "pattern_matches": [],
  "target_profile": {
    "type": "B2B SaaS",
    "confidence": 0.85
  },
  "reasoning": "Commercial .com domain with professional structure, no spam indicators",
  "passed": true
}
```

#### layer2_factors (Publication Detection)

```typescript
interface Layer2Factors {
  publication_score: number; // 0.0-1.0, threshold typically 0.7
  module_scores: {
    product_offering: number; // 0.0-1.0
    layout_quality: number; // 0.0-1.0
    navigation_complexity: number; // 0.0-1.0
    monetization_indicators: number; // 0.0-1.0
  };
  keywords_found: string[]; // Publication keywords detected
  ad_networks_detected: string[]; // e.g., ['Google Ads', 'Amazon Associates']
  content_signals: {
    has_blog: boolean;
    has_press_releases: boolean;
    has_whitepapers: boolean;
    has_case_studies: boolean;
  };
  reasoning: string; // Human-readable explanation
  passed: boolean; // Did URL pass Layer 2?
}
```

**Example:**
```json
{
  "publication_score": 0.82,
  "module_scores": {
    "product_offering": 0.75,
    "layout_quality": 0.90,
    "navigation_complexity": 0.85,
    "monetization_indicators": 0.78
  },
  "keywords_found": ["whitepapers", "case studies", "blog", "resources"],
  "ad_networks_detected": [],
  "content_signals": {
    "has_blog": true,
    "has_press_releases": false,
    "has_whitepapers": true,
    "has_case_studies": true
  },
  "reasoning": "Strong publication signals: blog section, whitepapers, case studies. High-quality layout with professional navigation.",
  "passed": true
}
```

#### layer3_factors (Sophistication Analysis)

```typescript
interface Layer3Factors {
  classification: 'accepted' | 'rejected';
  sophistication_signals: {
    design_quality: {
      score: number; // 0.0-1.0
      indicators: string[]; // e.g., ['modern-typography', 'consistent-branding']
    };
    authority_indicators: {
      score: number; // 0.0-1.0
      indicators: string[]; // e.g., ['industry-awards', 'media-mentions']
    };
    professional_presentation: {
      score: number; // 0.0-1.0
      indicators: string[]; // e.g., ['team-page', 'company-values']
    };
    content_originality: {
      score: number; // 0.0-1.0
      indicators: string[]; // e.g., ['unique-research', 'original-insights']
    };
  };
  llm_provider: string; // 'openai-gpt4', 'anthropic-claude', 'google-gemini'
  model_version: string; // e.g., 'gpt-4-turbo-preview'
  cost_usd: number; // LLM API call cost
  reasoning: string; // Full LLM explanation (up to 5000 chars)
  tokens_used: {
    input: number;
    output: number;
  };
  processing_time_ms: number;
}
```

**Example:**
```json
{
  "classification": "accepted",
  "sophistication_signals": {
    "design_quality": {
      "score": 0.88,
      "indicators": [
        "Modern, clean typography with excellent readability",
        "Consistent color scheme and branding throughout",
        "Professional imagery and graphics",
        "Responsive design with mobile optimization"
      ]
    },
    "authority_indicators": {
      "score": 0.82,
      "indicators": [
        "Featured in TechCrunch and Forbes",
        "G2 Leader badge displayed prominently",
        "Client logos include Fortune 500 companies",
        "Active social proof with testimonials"
      ]
    },
    "professional_presentation": {
      "score": 0.90,
      "indicators": [
        "Detailed team page with leadership bios",
        "Clear company mission and values",
        "Comprehensive about page with history",
        "Professional contact page with multiple channels"
      ]
    },
    "content_originality": {
      "score": 0.75,
      "indicators": [
        "Original research reports published quarterly",
        "Unique industry benchmarking data",
        "Thought leadership blog with expert authors",
        "Proprietary methodology explained in depth"
      ]
    }
  },
  "llm_provider": "openai",
  "model_version": "gpt-4-turbo-preview",
  "cost_usd": 0.00145,
  "reasoning": "This website demonstrates exceptional sophistication across all dimensions. The design quality is outstanding with modern typography, consistent branding, and professional imagery. Authority indicators are strong, including media features in TechCrunch and Forbes, G2 Leader status, and Fortune 500 client logos. Professional presentation is excellent with detailed team bios, clear company values, and comprehensive contact information. Content originality is good with quarterly research reports and proprietary benchmarking data, though some blog content follows common industry patterns. Overall, this is a highly sophisticated B2B publication that clearly targets decision-makers with thought leadership and data-driven insights.",
  "tokens_used": {
    "input": 3250,
    "output": 287
  },
  "processing_time_ms": 4523
}
```

### Validation Rules

**Type-level validation (TypeScript + class-validator):**

```typescript
import { IsIn, IsNumber, Min, Max, IsString, IsBoolean, ValidateNested } from 'class-validator';

class Layer1FactorsDto {
  @IsIn(['gtld', 'cctld', 'custom'])
  tld_type: string;

  @IsString()
  tld_value: string;

  @IsIn(['commercial', 'personal', 'institutional', 'spam'])
  domain_classification: string;

  @IsString({ each: true })
  pattern_matches: string[];

  @ValidateNested()
  target_profile: {
    type: string;
    confidence: number;
  };

  @IsString()
  reasoning: string;

  @IsBoolean()
  passed: boolean;
}

class Layer2FactorsDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  publication_score: number;

  @ValidateNested()
  module_scores: {
    product_offering: number;
    layout_quality: number;
    navigation_complexity: number;
    monetization_indicators: number;
  };

  @IsString({ each: true })
  keywords_found: string[];

  @IsString({ each: true })
  ad_networks_detected: string[];

  @ValidateNested()
  content_signals: {
    has_blog: boolean;
    has_press_releases: boolean;
    has_whitepapers: boolean;
    has_case_studies: boolean;
  };

  @IsString()
  reasoning: string;

  @IsBoolean()
  passed: boolean;
}

class Layer3FactorsDto {
  @IsIn(['accepted', 'rejected'])
  classification: string;

  @ValidateNested()
  sophistication_signals: {
    design_quality: { score: number; indicators: string[] };
    authority_indicators: { score: number; indicators: string[] };
    professional_presentation: { score: number; indicators: string[] };
    content_originality: { score: number; indicators: string[] };
  };

  @IsString()
  llm_provider: string;

  @IsString()
  model_version: string;

  @IsNumber()
  @Min(0)
  cost_usd: number;

  @IsString()
  reasoning: string;

  @ValidateNested()
  tokens_used: {
    input: number;
    output: number;
  };

  @IsNumber()
  processing_time_ms: number;
}
```

### Relationships

- **url_results** → **jobs**: Many-to-one (each result belongs to one job)
  - Foreign key: `job_id` references `jobs(id)` ON DELETE CASCADE
  - Index: `idx_url_results_job_id_processed_at` for efficient job results queries

---

## Entity: jobs (Enhanced)

**Purpose**: Track batch processing jobs with real-time progress metrics

**Table**: `jobs`

### Schema Changes

**New columns (migration required):**

```sql
-- Add archival support
ALTER TABLE jobs ADD COLUMN archived_at TIMESTAMPTZ;

-- Update status enum to include 'archived'
ALTER TABLE jobs DROP CONSTRAINT jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('queued', 'running', 'paused', 'completed', 'failed', 'archived'));

-- Add index for archival queries
CREATE INDEX idx_jobs_archived_at ON jobs (archived_at) WHERE archived_at IS NOT NULL;
```

### Complete Column Definitions

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| job_name | TEXT | NO | - | User-provided job name |
| status | TEXT | NO | 'queued' | 'queued', 'running', 'paused', 'completed', 'failed', 'archived' |
| created_at | TIMESTAMPTZ | NO | NOW() | When job was created |
| started_at | TIMESTAMPTZ | YES | NULL | When processing started |
| completed_at | TIMESTAMPTZ | YES | NULL | When processing completed |
| archived_at | TIMESTAMPTZ | YES | NULL | When job was archived (soft delete) |
| total_urls | INTEGER | NO | 0 | Total number of URLs in job |
| processed_urls | INTEGER | NO | 0 | Number of URLs processed so far |
| accepted_count | INTEGER | NO | 0 | URLs classified as accepted |
| rejected_count | INTEGER | NO | 0 | URLs classified as rejected |
| error_count | INTEGER | NO | 0 | URLs with permanent processing errors |
| total_cost | NUMERIC(10,8) | NO | 0.00000000 | Total cost in USD |
| layer1_eliminated | INTEGER | NO | 0 | URLs eliminated at Layer 1 |
| layer2_eliminated | INTEGER | NO | 0 | URLs eliminated at Layer 2 |
| layer3_classified | INTEGER | NO | 0 | URLs that reached Layer 3 |
| csv_file_path | TEXT | YES | NULL | Path to uploaded CSV file |
| updated_at | TIMESTAMPTZ | NO | NOW() | When record last updated |

### Lifecycle States

```typescript
enum JobStatus {
  QUEUED = 'queued', // Waiting for processing slot (system at max 5 concurrent jobs)
  RUNNING = 'running', // Actively processing URLs
  PAUSED = 'paused', // User manually paused (can be resumed)
  COMPLETED = 'completed', // All URLs processed successfully
  FAILED = 'failed', // Fatal error occurred (cannot be resumed)
  ARCHIVED = 'archived', // Soft-deleted (hidden from dashboard)
}
```

**State transitions:**
- `queued` → `running` (when job starts processing)
- `running` → `paused` (user pauses job)
- `paused` → `running` (user resumes job)
- `running` → `completed` (all URLs processed)
- `running` → `failed` (fatal error: database connection lost, invalid CSV format)
- Any state → `archived` (user manually archives or 90-day auto-archive)

### Validation Rules

```typescript
class JobDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  job_name: string;

  @IsIn(['queued', 'running', 'paused', 'completed', 'failed', 'archived'])
  status: JobStatus;

  @IsInt()
  @Min(0)
  total_urls: number;

  @IsInt()
  @Min(0)
  processed_urls: number;

  @IsNumber()
  @Min(0)
  total_cost: number;
}
```

### Query Patterns

**Active jobs (dashboard):**
```sql
SELECT * FROM jobs
WHERE archived_at IS NULL
  AND status IN ('queued', 'running', 'paused')
ORDER BY created_at DESC;
```

**Recently completed jobs (dashboard):**
```sql
SELECT * FROM jobs
WHERE archived_at IS NULL
  AND status = 'completed'
ORDER BY completed_at DESC
LIMIT 10;
```

**Archived jobs:**
```sql
SELECT * FROM jobs
WHERE archived_at IS NOT NULL
ORDER BY archived_at DESC;
```

**Jobs eligible for auto-archive (90 days old):**
```sql
UPDATE jobs
SET status = 'archived', archived_at = NOW()
WHERE status = 'completed'
  AND completed_at < NOW() - INTERVAL '90 days'
  AND archived_at IS NULL;
```

**Jobs eligible for hard delete (180 days old):**
```sql
DELETE FROM jobs
WHERE archived_at < NOW() - INTERVAL '90 days'; -- 90 days after archival = 180 days total
```

---

## Migration Strategy

### Migration Order (Critical)

1. **Migration 1**: Add new columns to `url_results` (JSONB, retry tracking)
2. **Migration 2**: Create GIN indexes on JSONB columns
3. **Migration 3**: Create indexes on filter columns
4. **Migration 4**: Add archival support to `jobs` table
5. **Migration 5**: Migrate pending manual review queue items (if any)
6. **Migration 6** (after 2 weeks): Drop manual review tables

### Backwards Compatibility

**Handling NULL JSONB columns:**
- Old url_results records (before migration) will have NULL layer factors
- Frontend must gracefully handle NULL values:
  ```typescript
  function renderFactorBreakdown(url: UrlResult) {
    if (!url.layer1_factors) {
      return <div>Factor data not available (processed before migration)</div>;
    }
    // Render factors...
  }
  ```
- CSV export must handle NULL values:
  ```typescript
  function exportToCSV(urls: UrlResult[]) {
    return urls.map(url => ({
      url: url.url,
      layer1_tld_type: url.layer1_factors?.tld_type ?? 'N/A',
      layer1_domain_class: url.layer1_factors?.domain_classification ?? 'N/A',
      // ...
    }));
  }
  ```

**Rollback plan:**
- If rollback needed, keep JSONB columns (don't drop)
- Re-enable manual review routing temporarily
- Data remains intact for re-migration

---

## Performance Considerations

### Storage Estimates

**Per URL:**
- Base url_results columns: ~500 bytes
- layer1_factors JSONB: ~300 bytes
- layer2_factors JSONB: ~800 bytes
- layer3_factors JSONB: ~2000 bytes (includes full LLM reasoning)
- **Total per URL: ~3.6 KB**

**Per job (10,000 URLs):**
- URL results: 10,000 * 3.6 KB = ~36 MB
- Job metadata: ~1 KB
- **Total per job: ~36 MB**

**Database growth:**
- 100 jobs/month * 36 MB = ~3.6 GB/month
- With compression: ~1.8 GB/month (PostgreSQL JSONB compression ~50%)
- Annual growth: ~22 GB/year

### Index Overhead

**GIN indexes (per column):**
- layer1_factors: ~10% of data size = ~300 KB per 10k URLs
- layer2_factors: ~10% of data size = ~800 KB per 10k URLs
- layer3_factors: ~10% of data size = ~2 MB per 10k URLs
- **Total index overhead: ~3 MB per 10k URLs (8% overhead)**

### Query Performance Targets

| Query | Target | Strategy |
|-------|--------|----------|
| Fetch job results (50 rows) | <100ms | Use pagination, indexed job_id + processed_at |
| Filter by eliminated_at_layer | <200ms | Use index on eliminated_at_layer |
| Filter by confidence range | <200ms | Use index on confidence_score |
| JSONB containment query | <500ms | Use GIN index (e.g., `layer1_factors @> '{"passed": true}'`) |
| CSV export (10k rows) | <5s | Streaming with 100-row batches |

---

## TypeScript Types (Shared Package)

**Location**: `packages/shared/src/types/url-results.ts`

```typescript
export interface Layer1Factors {
  tld_type: 'gtld' | 'cctld' | 'custom';
  tld_value: string;
  domain_classification: 'commercial' | 'personal' | 'institutional' | 'spam';
  pattern_matches: string[];
  target_profile: {
    type: string;
    confidence: number;
  };
  reasoning: string;
  passed: boolean;
}

export interface Layer2Factors {
  publication_score: number;
  module_scores: {
    product_offering: number;
    layout_quality: number;
    navigation_complexity: number;
    monetization_indicators: number;
  };
  keywords_found: string[];
  ad_networks_detected: string[];
  content_signals: {
    has_blog: boolean;
    has_press_releases: boolean;
    has_whitepapers: boolean;
    has_case_studies: boolean;
  };
  reasoning: string;
  passed: boolean;
}

export interface Layer3Factors {
  classification: 'accepted' | 'rejected';
  sophistication_signals: {
    design_quality: {
      score: number;
      indicators: string[];
    };
    authority_indicators: {
      score: number;
      indicators: string[];
    };
    professional_presentation: {
      score: number;
      indicators: string[];
    };
    content_originality: {
      score: number;
      indicators: string[];
    };
  };
  llm_provider: string;
  model_version: string;
  cost_usd: number;
  reasoning: string;
  tokens_used: {
    input: number;
    output: number;
  };
  processing_time_ms: number;
}

export interface UrlResult {
  id: string;
  url: string;
  job_id: string;
  final_decision: 'accepted' | 'rejected' | 'error' | 'pending_migration';
  confidence_score: number | null;
  eliminated_at_layer: 'layer1' | 'layer2' | 'layer3' | 'passed_all' | null;
  processing_time_ms: number;
  total_cost: number;
  retry_count: number;
  last_error: string | null;
  layer1_factors: Layer1Factors | null;
  layer2_factors: Layer2Factors | null;
  layer3_factors: Layer3Factors | null;
  processed_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Job {
  id: string;
  job_name: string;
  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'archived';
  created_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  archived_at: Date | null;
  total_urls: number;
  processed_urls: number;
  accepted_count: number;
  rejected_count: number;
  error_count: number;
  total_cost: number;
  layer1_eliminated: number;
  layer2_eliminated: number;
  layer3_classified: number;
  csv_file_path: string | null;
  updated_at: Date;
}
```

---

## Summary

**Schema changes:**
- ✅ url_results: +5 columns (3 JSONB, 2 retry tracking)
- ✅ url_results: +6 indexes (3 GIN for JSONB, 3 B-tree for filters)
- ✅ jobs: +1 column (archived_at), status enum update

**Performance:**
- ✅ Storage: ~3.6 KB per URL, ~36 MB per 10k URL job
- ✅ Index overhead: ~8% additional storage
- ✅ Query targets: <200ms filters, <5s CSV export

**Type safety:**
- ✅ TypeScript interfaces in shared package
- ✅ DTOs with class-validator for runtime validation
- ✅ Consistent types across API, frontend, database

Ready for Phase 1 continuation: API Contracts generation.
