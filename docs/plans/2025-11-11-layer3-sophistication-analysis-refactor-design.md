# Layer 3 Sophistication Analysis Refactor - Design Document

**Date:** 2025-11-11
**Status:** Design Phase Complete
**Author:** System Design

## Executive Summary

Refactor Layer 3 from a single generic LLM classification into a sophisticated hybrid detection system that matches the architectural sophistication of Layer 1 and Layer 2. The new system will provide structured signal breakdowns, better classification accuracy, and explainable decisions while maintaining similar cost and performance characteristics.

## Problem Statement

### Current Layer 3 Issues

1. **Lack of Structure:** Despite using powerful LLMs, Layer 3 returns a single confidence score duplicated across 4 signals (design_quality, content_originality, authority_indicators, professional_presentation)

2. **MVP Placeholder in Production:** Code comment on line 656 of `llm.service.ts`: `"For MVP, use overall confidence as proxy for all signals"` - this temporary solution was never improved

3. **Architectural Inconsistency:** Layer 1 and 2 provide detailed factor breakdowns for manual review, but Layer 3 cannot meaningfully contribute because it lacks individual signal scores

4. **Black Box Classification:** Single LLM prompt returns binary suitable/not_suitable without structured analysis of individual sophistication signals

### Requirements Gathered

- **Goal:** Effectiveness - better detection accuracy
- **Cost Tolerance:** 2-3x increase acceptable
- **Complexity:** Complete rewrite acceptable
- **Success Criteria:**
  - Structured signal breakdowns for manual review UI
  - Better classification accuracy
  - Architectural consistency with Layer 1/2
  - Explainable decisions with clear reasoning

## Architecture Overview

### Modular Detector Pattern

Following Layer 2's proven architecture, Layer 3 will use **4 independent signal analyzers** + **1 aggregation layer**:

```
Layer3SophisticationAnalysisService (Orchestrator)
├── DesignQualityDetector (Cheerio-based)
├── AuthorityIndicatorDetector (Cheerio-based)
├── ProfessionalPresentationDetector (Cheerio-based)
├── ContentOriginalityAnalyzer (LLM-based)
└── AggregationLayer (Weighted scoring)
```

### Dependencies

- **Cheerio** (existing) - HTML parsing for 3 rule-based detectors
- **Gemini/GPT-4o** (existing) - LLM for ContentOriginalityAnalyzer only
- **No new external APIs** - All authority detection uses on-page signals

### File Structure

```
apps/api/src/jobs/services/
├── llm.service.ts (DEPRECATED - keep for reference)
├── layer3-sophistication-analysis.service.ts (NEW - main orchestrator)
└── layer3-detectors/
    ├── design-quality.detector.ts
    ├── authority-indicator.detector.ts
    ├── professional-presentation.detector.ts
    └── content-originality.analyzer.ts (LLM-based)
```

## Detector Specifications

### 1. DesignQualityDetector (Cheerio-based)

**Analyzes:**
- **Modern framework detection:** React/Vue/Angular artifacts in HTML, bundled JS patterns
- **Responsive design:** Viewport meta tags, media query presence, grid/flexbox usage
- **CDN usage:** Images/assets served from CDNs (cloudfront, cloudflare, imgix)
- **Font quality:** Google Fonts, Adobe Fonts, custom webfonts vs. system fonts
- **CSS sophistication:** Tailwind/Bootstrap classes, CSS variables, modern properties

**Scoring:** Count detected signals, weight by importance, normalize to 0-1

**Output:**
```typescript
{
  score: 0.85,
  detected: true,
  reasoning: "Modern React app with responsive design, professional fonts, CDN assets",
  signals: ["react-framework", "responsive-viewport", "cdn-images", "google-fonts"]
}
```

### 2. AuthorityIndicatorDetector (Cheerio-based)

**Analyzes:**
- **Press mentions:** "As featured in", logo grids with media outlets
- **Client logos:** Sections with client/customer/partner logos
- **Awards/certifications:** G2 badges, industry certifications, "Best of" awards
- **Trust badges:** Norton, McAfee, BBB, industry-specific seals
- **Team indicators:** "50+ employees", "global team", headcount signals
- **Social presence:** LinkedIn, Twitter, YouTube links

**Scoring:** Weighted sum of detected authority signals, normalize to 0-1

**Output:**
```typescript
{
  score: 0.72,
  detected: true,
  reasoning: "Featured in TechCrunch, 20+ client logos, G2 Leader badge",
  signals: ["press-techcrunch", "client-logos-20", "g2-badge"]
}
```

### 3. ProfessionalPresentationDetector (Cheerio-based)

**Analyzes:**
- **Layout structure:** Semantic HTML5 tags, proper heading hierarchy, nav/header/footer
- **Media quality:** High-res images (check dimensions), video embeds, image optimization
- **Typography:** Font size hierarchy, line spacing, professional font pairings
- **Whitespace:** Padding/margin patterns indicating intentional design
- **Accessibility:** Alt tags, ARIA labels, semantic structure

**Scoring:** Aggregate layout + media + typography scores, normalize to 0-1

**Output:**
```typescript
{
  score: 0.78,
  detected: true,
  reasoning: "Semantic HTML5, high-quality images, proper heading hierarchy, good accessibility",
  signals: ["semantic-html", "optimized-images", "typography-hierarchy", "aria-labels"]
}
```

### 4. ContentOriginalityAnalyzer (LLM-based)

**Analyzes (via focused prompt):**
- Content depth and uniqueness
- Original insights vs. generic advice
- Proprietary methodologies/frameworks
- Case studies and specific examples
- Writing quality and expertise

**Scoring:** LLM returns confidence score 0-1 with reasoning

**Output:**
```typescript
{
  score: 0.88,
  detected: true,
  reasoning: "Original research with proprietary framework, detailed case studies, expert-level insights",
  signals: ["proprietary-methodology", "case-studies", "expert-depth"]
}
```

## Aggregation Logic

### Weighted Scoring Formula

```typescript
sophistication_score =
  (design_quality * 0.20) +
  (authority_indicators * 0.25) +
  (professional_presentation * 0.20) +
  (content_originality * 0.35)
```

**Rationale for weights:**
- **Content originality: 35%** - Most indicative of sophistication
- **Authority indicators: 25%** - Strong signal of established presence
- **Design quality: 20%** - Important but can be templated
- **Professional presentation: 20%** - Table stakes for modern sites

### Classification Logic

```typescript
if (sophistication_score >= threshold) {  // default: 0.65
  classification = 'suitable'
} else {
  classification = 'not_suitable'
}
```

### Database Configuration (Layer3Rules)

Following Layer 2's pattern, create `layer3_rules` table:

```typescript
interface Layer3Rules {
  // Detector weights
  design_quality_weight: number;          // default: 0.20
  authority_indicators_weight: number;    // default: 0.25
  professional_presentation_weight: number; // default: 0.20
  content_originality_weight: number;     // default: 0.35

  // Classification threshold
  sophistication_threshold: number;       // default: 0.65

  // Manual review thresholds
  min_detectors_required: number;         // default: 3 (out of 4)
  uncertain_zone_min: number;             // default: 0.45
  uncertain_zone_max: number;             // default: 0.70
  max_score_variance: number;             // default: 0.35

  // Per-detector configuration
  design_quality_config: {
    min_signals_required: number;
    framework_weight: number;
    responsive_weight: number;
    cdn_weight: number;
  };

  authority_indicators_config: {
    min_signals_required: number;
    press_weight: number;
    clients_weight: number;
    awards_weight: number;
  };

  professional_presentation_config: {
    min_signals_required: number;
    layout_weight: number;
    media_weight: number;
    typography_weight: number;
  };
}
```

### Structured Results Storage

Matches Layer 1/2 pattern for manual review UI:

```typescript
layer3_signals: {
  design_quality: {
    score: 0.85,
    detected: true,
    reasoning: "Modern React app with responsive design...",
    signals: ["react-framework", "responsive-viewport", "cdn-images", "google-fonts"]
  },
  authority_indicators: {
    score: 0.72,
    detected: true,
    reasoning: "Featured in TechCrunch, 20+ client logos...",
    signals: ["press-techcrunch", "client-logos-20", "g2-badge"]
  },
  professional_presentation: {
    score: 0.78,
    detected: true,
    reasoning: "Semantic HTML5, high-quality images...",
    signals: ["semantic-html", "optimized-images", "typography-hierarchy"]
  },
  content_originality: {
    score: 0.88,
    detected: true,
    reasoning: "Original research with proprietary framework...",
    signals: ["proprietary-methodology", "case-studies", "expert-depth"]
  },

  aggregate: {
    sophistication_score: 0.81,  // weighted average
    classification: 'suitable',
    weights_used: {
      design: 0.20,
      authority: 0.25,
      presentation: 0.20,
      content: 0.35
    }
  }
}
```

## Error Handling and Manual Review Escalation

### Core Principle

**"Everything we don't have enough data on should be given to manual review and labeled accordingly"**

### Manual Review Triggers

#### 1. Insufficient Detector Coverage

```typescript
const MIN_DETECTORS_REQUIRED = 3; // out of 4
const successfulDetectors = detectorResults.filter(r => r.status === 'fulfilled').length;

if (successfulDetectors < MIN_DETECTORS_REQUIRED) {
  return {
    needs_manual_review: true,
    manual_review_reason: 'insufficient_detector_coverage',
    manual_review_label: `Only ${successfulDetectors}/4 detectors succeeded`,
    available_signals: { /* partial results */ }
  };
}
```

#### 2. Low Confidence / Uncertain Zone

```typescript
const UNCERTAIN_ZONE_MIN = 0.45;
const UNCERTAIN_ZONE_MAX = 0.70;

if (score >= UNCERTAIN_ZONE_MIN && score <= UNCERTAIN_ZONE_MAX) {
  return {
    needs_manual_review: true,
    manual_review_reason: 'low_confidence_score',
    manual_review_label: `Uncertain score: ${score.toFixed(2)} (needs human judgment)`,
    sophistication_score: score
  };
}
```

#### 3. Conflicting Signals (High Variance)

```typescript
const scores = [design.score, authority.score, presentation.score, content.score];
const standardDeviation = calculateStdDev(scores);

if (standardDeviation > 0.35) {
  return {
    needs_manual_review: true,
    manual_review_reason: 'conflicting_signals',
    manual_review_label: 'Detectors show conflicting results (high variance)',
    score_variance: standardDeviation
  };
}
```

#### 4. Insufficient Content Quality

```typescript
if (html.length < 5000 || !hasMinimumStructure(html)) {
  return {
    needs_manual_review: true,
    manual_review_reason: 'insufficient_content',
    manual_review_label: 'Scraped content too short or malformed for reliable analysis'
  };
}
```

### Manual Review Labels in UI

```typescript
// In ManualReviewQueue component
{url.manual_review_reason === 'insufficient_detector_coverage' && (
  <Badge variant="warning">
    ⚠️ Partial Analysis: {url.manual_review_label}
  </Badge>
)}

{url.manual_review_reason === 'low_confidence_score' && (
  <Badge variant="info">
    🤔 Uncertain: {url.manual_review_label}
  </Badge>
)}

{url.manual_review_reason === 'conflicting_signals' && (
  <Badge variant="caution">
    ⚡ Mixed Signals: {url.manual_review_label}
  </Badge>
)}
```

### Detector-Level Error Handling

Each detector is independently resilient:

```typescript
const detectorResults = await Promise.allSettled([
  designQualityDetector.analyze(html),
  authorityIndicatorDetector.analyze(html),
  professionalPresentationDetector.analyze(html),
  contentOriginalityAnalyzer.analyze(content)
]);

// Handle failures gracefully
detectorResults.forEach((result, index) => {
  if (result.status === 'rejected') {
    logger.error(`Detector ${index} failed: ${result.reason}`);
    // Use neutral score (0.5) or escalate to manual review
  }
});
```

### LLM-Specific Resilience

Following existing `llm.service.ts` patterns:
- Retry logic: 3 attempts with exponential backoff
- Provider fallback: Gemini → GPT-4o-mini
- Timeout handling: 30s per call
- Rate limit handling: Exponential backoff on 429 errors

### Activity Logging

```typescript
activityLog.create({
  url_id: url.id,
  action: 'layer3_analysis_completed',
  details: {
    sophistication_score: 0.78,
    detectors_succeeded: ['design', 'authority', 'presentation', 'content'],
    detectors_failed: [],
    llm_provider_used: 'gemini',
    processing_time_ms: 3500,
    manual_review_triggered: false
  }
});

// For insufficient data cases
activityLog.create({
  action: 'layer3_insufficient_data',
  details: {
    successful_detectors: ['design', 'authority'],
    failed_detectors: ['presentation', 'content'],
    partial_score: 0.65,
    escalation_reason: 'insufficient_detector_coverage'
  }
});
```

## Integration with Existing System

### Job Processor Integration

```typescript
// In url-screening.processor.ts
// OLD (remove):
// const layer3Result = await this.llmService.classifyUrl(url);

// NEW (replace):
const layer3Result = await this.layer3Service.analyze(url, html);

// Flow remains:
// Layer 1 → Layer 2 → Layer 3 → Manual Review
```

### Manual Review UI

- FactorBreakdown component already supports layer3_signals
- Will display 4 individual signal scores instead of 4 duplicate scores
- No UI changes needed if data structure maintained

### Settings UI

Create `Layer3SophisticationTab.tsx` matching Layer2PublicationTab pattern:
- Weight sliders for each detector (design, authority, presentation, content)
- Threshold slider for sophistication_score
- Per-detector configuration (advanced section)
- Reset to defaults button

## Performance and Cost Analysis

### Execution Performance

```typescript
// Parallel execution
const [designResult, authorityResult, presentationResult, contentResult] =
  await Promise.all([
    designQualityDetector.analyze(html),      // ~50-100ms
    authorityIndicatorDetector.analyze(html), // ~50-100ms
    professionalPresentationDetector.analyze(html), // ~50-100ms
    contentOriginalityAnalyzer.analyze(content) // ~2-4s (LLM)
  ]);
```

**Expected timing:**
- Cheerio detectors: 50-100ms each (parallel, so ~100ms total)
- LLM call: 2-4 seconds
- **Total Layer 3 time: ~2-4 seconds**

**Comparable to current implementation** (single LLM call).

### Cost Analysis

**Current Layer 3 cost per URL:**
- 1 LLM call: ~$0.01-0.02 per URL (Gemini)

**New Layer 3 cost per URL:**
- 3 Cheerio detectors: $0 (free HTML parsing)
- 1 LLM call (ContentOriginalityAnalyzer): ~$0.01-0.02
- **Total: ~$0.01-0.02 per URL**

**Cost stays the same** - moving from "1 generic LLM call" to "3 free Cheerio + 1 focused LLM call"

### Scalability

- **Database:** layer3_signals JSONB field supports unlimited detector results
- **Configuration:** Adding new detectors only requires new detector class + weight config
- **Future API integration:** AuthorityIndicatorDetector can add Moz/Ahrefs later without architecture changes

## Testing Strategy

### Unit Tests

**Per Detector:**
```typescript
// design-quality.detector.spec.ts
describe('DesignQualityDetector', () => {
  it('detects React framework from HTML artifacts');
  it('detects responsive design from viewport meta');
  it('returns neutral score when no signals detected');
  it('handles malformed HTML gracefully');
});

// Similar for: authority-indicator, professional-presentation, content-originality
```

### Integration Tests

```typescript
// layer3-sophistication-analysis.service.spec.ts
describe('Layer3SophisticationAnalysisService', () => {
  it('aggregates detector scores correctly');
  it('escalates to manual review when < 3 detectors succeed');
  it('escalates to manual review on conflicting signals');
  it('escalates to manual review on uncertain scores (0.45-0.70)');
  it('handles LLM failure gracefully with Cheerio-only fallback');
  it('loads configuration from SettingsService');
  it('stores structured results in layer3_signals');
});
```

### E2E Tests

```typescript
it('processes URL through Layer 1 → 2 → 3 → Manual Review');
it('URL with high sophistication score passes Layer 3');
it('URL with low sophistication score fails Layer 3');
it('Partial detector failure triggers manual review with correct label');
```

## Implementation Approach

### Clean Replacement (No Migration)

1. **Build new system completely**
   - Create detector files in `layer3-detectors/`
   - Build `Layer3SophisticationAnalysisService`
   - Add `Layer3Rules` entity with database migration
   - Write comprehensive test suite

2. **Swap in url-screening.processor.ts**
   - Replace `llmService.classifyUrl()` call with `layer3Service.analyze()`
   - Update imports

3. **Deprecate old llm.service.ts**
   - Keep file for reference
   - Remove from active imports
   - Can delete after confirming new system works

4. **Add Settings UI**
   - Create `Layer3SophisticationTab` component
   - Add to Settings page

**No parallel execution, no feature flags, no gradual rollout.**

## Success Metrics

### Effectiveness Improvements

- ✅ Individual signal scores (not 4 duplicates)
- ✅ Structured breakdowns for manual review
- ✅ Clear reasoning per signal
- ✅ Architectural consistency with Layer 1/2

### Technical Metrics

- Manual review escalation rate: 20-30% (acceptable for better accuracy)
- Processing time: ~2-4 seconds (same as current)
- Cost per URL: ~$0.01-0.02 (same as current)
- Test coverage: >90% for detector logic

## Future Enhancements

### Phase 2 (Optional)

- **External API Integration:** Add Moz/Ahrefs to AuthorityIndicatorDetector
- **Machine Learning:** Train model on manual review decisions to improve weights
- **A/B Testing:** Compare detector configurations in production
- **Signal Discovery:** Automatically identify new signals from manual review patterns

## Conclusion

This design transforms Layer 3 from a single generic LLM call into a sophisticated hybrid detection system that:
- Matches the architectural patterns of Layer 1 and 2
- Provides structured, explainable signal breakdowns
- Maintains similar cost and performance characteristics
- Escalates uncertain cases to manual review with clear labels

The modular detector pattern allows for independent testing, configuration, and future enhancement without disrupting the core system.
