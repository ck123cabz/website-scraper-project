# Architecture Documentation - Shared Library

**Part:** Shared
**Type:** TypeScript Library
**Framework:** None (Pure TypeScript)
**Language:** TypeScript 5.5
**Root Path:** `packages/shared/`
**Last Updated:** 2025-01-18

---

## Executive Summary

The Shared library is a **pure TypeScript package** that provides shared type definitions, Zod schemas, and utility functions used by both the API backend and Web frontend. It ensures type safety across the monorepo and serves as the single source of truth for data structures.

### Key Characteristics

- **Purpose:** Shared types, schemas, and utilities
- **Dependencies:** Minimal (only Zod for runtime validation)
- **Exports:** TypeScript types + Zod schemas + utility functions
- **Consumed By:** `@website-scraper/api` + `web` (Next.js app)
- **Build Output:** None (consumed as TypeScript source)

---

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Language** | TypeScript | 5.5 | Type-safe code |
| **Validation** | Zod | 3.25 | Runtime schema validation |
| **Testing** | Jest | 30.2 | Unit tests for utilities |

---

## Exported Modules

### Type Definitions (`src/types/`)

**Core Domain Types:**

1. **`job.ts`** - Job entity types
   ```typescript
   export interface Job {
     id: string;
     name: string;
     status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
     total_urls: number;
     processed_urls: number;
     created_at: Date | string;
     started_at?: Date | string;
     completed_at?: Date | string;
   }
   ```

2. **`result.ts`** - URL result types
   ```typescript
   export interface UrlResult {
     id: string;
     job_id: string;
     url: string;
     current_layer: 'layer1' | 'layer2' | 'layer3';
     layer1_status: 'pass' | 'reject';
     layer2_status?: 'pass' | 'reject';
     layer3_classification?: 'approved' | 'rejected';
     confidence_band?: 'high' | 'medium' | 'low' | 'auto_reject';
     confidence_score?: number;
     layer1_factors: Record<string, any>;
     layer2_factors?: Record<string, any>;
     layer3_factors?: Record<string, any>;
   }
   ```

3. **`layer1.ts`** - Layer 1 analysis types
   ```typescript
   export interface Layer1AnalysisResult {
     status: 'pass' | 'reject';
     rejection_reasons: string[];
     matched_patterns: string[];
     domain_category?: string;
   }

   export interface Layer1DomainRules {
     url_pattern_exclusions: UrlPatternRule[];
     domain_categories: Record<string, string[]>;
   }
   ```

4. **`layer2.ts`** - Layer 2 operational types
   ```typescript
   export interface Layer2OperationalSignals {
     has_about_page: boolean;
     has_contact_page: boolean;
     has_team_page: boolean;
     recent_post_count: number;
     last_post_date?: string;
     blog_freshness_days?: number;
     detected_cms?: string;
     tech_stack: string[];
   }
   ```

5. **`layer3-analysis.ts`** - Layer 3 LLM types
   ```typescript
   export interface Layer3LlmClassification {
     classification: 'approved' | 'rejected';
     confidence_score: number;
     confidence_band: 'high' | 'medium' | 'low' | 'auto_reject';
     llm_provider: 'gemini' | 'gpt';
     classification_reasoning: string;
     confidence_explanation: string;
     relevance_indicators: string[];
     red_flags: string[];
   }
   ```

6. **`settings.ts`** - Settings types
   ```typescript
   export interface ClassificationSettings {
     id: string;
     layer1_rules: Layer1Rules;
     layer2_rules: Layer2Rules;
     layer3_rules: Layer3Rules;
     created_at: string;
     updated_at: string;
   }
   ```

7. **`worker.ts`** - BullMQ worker types
   ```typescript
   export interface UrlJobData {
     jobId: string;
     url: string;
     urlId: string;
   }
   ```

### Zod Schemas (`src/schemas/`)

**Runtime Validation Schemas:**

1. **`job.ts`** - Job validation
   ```typescript
   export const jobSchema = z.object({
     id: z.string().uuid(),
     name: z.string().min(1).max(255),
     status: z.enum(['pending', 'running', 'paused', 'completed', 'failed']),
     total_urls: z.number().int().min(0),
     processed_urls: z.number().int().min(0),
     created_at: z.union([z.date(), z.string().datetime()]),
   });
   ```

2. **`result.ts`** - Result validation
   ```typescript
   export const urlResultSchema = z.object({
     id: z.string().uuid(),
     url: z.string().url(),
     layer1_status: z.enum(['pass', 'reject']),
     layer3_classification: z.enum(['approved', 'rejected']).optional(),
   });
   ```

### Utility Functions (`src/utils/`)

**1. `format.ts`** - Formatting utilities
```typescript
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString();
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}
```

---

## Package Structure

```
packages/shared/
├── src/
│   ├── index.ts                    # Main export file
│   ├── types/                      # TypeScript type definitions
│   │   ├── job.ts
│   │   ├── result.ts
│   │   ├── layer1.ts
│   │   ├── layer2.ts
│   │   ├── layer3-analysis.ts
│   │   ├── settings.ts
│   │   ├── worker.ts
│   │   ├── scraper.ts
│   │   └── __tests__/              # Type tests
│   ├── schemas/                    # Zod validation schemas
│   │   ├── job.ts
│   │   ├── result.ts
│   │   └── activity-log.ts
│   └── utils/                      # Utility functions
│       ├── format.ts
│       └── format.test.ts
├── package.json
└── tsconfig.json
```

---

## Usage Examples

### In API Backend (`apps/api/`)

```typescript
import type { Job, UrlResult, Layer1AnalysisResult } from '@website-scraper/shared';
import { jobSchema, urlResultSchema } from '@website-scraper/shared';
import { formatCurrency, formatDuration } from '@website-scraper/shared';

// Type-safe data structures
const job: Job = {
  id: '123',
  name: 'Test Job',
  status: 'running',
  total_urls: 100,
  processed_urls: 50,
  created_at: new Date(),
};

// Runtime validation
const validated = jobSchema.parse(job);

// Utility functions
console.log(formatCurrency(0.0012)); // "$0.0012"
console.log(formatDuration(2500)); // "2s"
```

### In Web Frontend (`apps/web/`)

```typescript
import type { Job, UrlResult } from '@website-scraper/shared';
import { formatCurrency, formatPercentage } from '@website-scraper/shared';

// Type-safe props
interface JobCardProps {
  job: Job;
}

function JobCard({ job }: JobCardProps) {
  const progress = job.processed_urls / job.total_urls;

  return (
    <div>
      <h3>{job.name}</h3>
      <p>Progress: {formatPercentage(progress)}</p>
    </div>
  );
}
```

---

## Testing

### Unit Tests

```typescript
// utils/format.test.ts
describe('formatCurrency', () => {
  it('formats small amounts with 4 decimals', () => {
    expect(formatCurrency(0.0012)).toBe('$0.0012');
  });

  it('formats large amounts with 4 decimals', () => {
    expect(formatCurrency(123.45)).toBe('$123.4500');
  });
});
```

**Test Coverage:**
- Utility functions: 100%
- Type tests: Compile-time (tsc --noEmit)

---

## Build and Distribution

**No Build Step:**
- Consumed as TypeScript source files
- Monorepo packages import directly from `src/`
- TypeScript compiler resolves types at compile time

**Package Resolution:**
```json
{
  "name": "@website-scraper/shared",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

---

## Version Control

**Versioning Strategy:**
- Shared package version: 0.1.0 (not published to npm)
- Breaking changes require updates to all consumers
- Type changes validated by TypeScript compiler across monorepo

---

## Related Documentation

- **[Architecture - API Backend](./architecture-api.md)** - Consumer of shared types
- **[Architecture - Web Frontend](./architecture-web.md)** - Consumer of shared types
- **[Integration Architecture](./integration-architecture.md)** - Type contracts

---

**Documentation Generated:** 2025-01-18
**Library Version:** 0.1.0
