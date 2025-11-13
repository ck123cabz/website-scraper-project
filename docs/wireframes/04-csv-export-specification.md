# CSV Export Specification
**Feature:** Manual Review System - Rich CSV Export Format
**Version:** 1.0
**Last Updated:** 2025-11-13

---

## Overview

This document defines the rich CSV export format for URL classification results. The CSV format is designed for manual review in Excel/Google Sheets, providing comprehensive analysis data from all three classification layers plus job metadata.

Users will use this CSV to:
- Perform detailed manual review of URLs outside the application
- Create pivot tables and custom analysis
- Share results with team members
- Archive job results for compliance/audit purposes

---

## Complete Column List (48 columns)

### Core Columns (7 columns)
| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| `url` | string | Original URL submitted for classification |
| `final_decision` | enum | Final classification result: `accepted`, `rejected`, `manual_review_required`, `queue_overflow`, `processing_error` |
| `confidence_score` | number | Final confidence score from 0.00 to 1.00 (2 decimal places) |
| `confidence_band` | string | Confidence band name (e.g., "high", "medium", "low", "auto_reject") |
| `eliminated_at_layer` | enum | Layer where URL was eliminated: `layer1`, `layer2`, `layer3`, `passed_all`, `null` (if error) |
| `processing_time_ms` | integer | Total processing time in milliseconds (sum of all layers) |
| `total_cost` | number | Total processing cost in USD (4 decimal places, e.g., 0.0023) |

### Layer 1: Domain Analysis (8 columns)
| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| `layer1_passed` | boolean | `true` if passed Layer 1, `false` if eliminated |
| `layer1_processing_time_ms` | integer | Layer 1 processing time in milliseconds |
| `layer1_tld_type` | string | Top-level domain (e.g., "com", "io", "blog") |
| `layer1_tld_passed` | boolean | `true` if TLD is in commercial whitelist |
| `layer1_domain_classification` | enum | Domain type: `digital_native`, `traditional`, `personal_blog`, `unknown` |
| `layer1_url_pattern_match` | string | Matched exclusion pattern (e.g., "blog.example.com", "/tag/", empty if none) |
| `layer1_target_profile` | enum | Target profile match: `positive`, `negative`, `neutral` |
| `layer1_reasoning` | string | Human-readable explanation of Layer 1 decision |

### Layer 2: Publication Detection (14 columns)
| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| `layer2_passed` | boolean | `true` if passed Layer 2, `false` if eliminated |
| `layer2_processing_time_ms` | integer | Layer 2 processing time in milliseconds |
| `layer2_publication_score` | number | Overall publication score 0.00-1.00 (threshold typically 0.65) |
| `layer2_product_offering_score` | number | Product offering module score 0.00-1.00 |
| `layer2_layout_score` | number | Homepage layout module score 0.00-1.00 |
| `layer2_navigation_score` | number | Navigation analysis module score 0.00-1.00 |
| `layer2_monetization_score` | number | Monetization detection module score 0.00-1.00 |
| `layer2_has_product_offering` | boolean | `true` if product/service offerings detected |
| `layer2_product_keywords` | string | Comma-separated list of detected product keywords |
| `layer2_layout_type` | enum | Homepage layout: `blog`, `marketing`, `mixed` |
| `layer2_business_nav_percentage` | number | Percentage of business navigation (0.00-1.00) |
| `layer2_monetization_type` | enum | Monetization model: `ads`, `affiliates`, `business`, `mixed`, `unknown` |
| `layer2_ad_networks` | string | Comma-separated list of detected ad networks |
| `layer2_reasoning` | string | Human-readable explanation of Layer 2 decision |

### Layer 3: LLM Classification (15 columns)
| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| `layer3_passed` | boolean | `true` if classified as suitable, `false` if not suitable |
| `layer3_processing_time_ms` | integer | Layer 3 processing time in milliseconds |
| `layer3_classification` | enum | LLM classification: `suitable`, `not_suitable` |
| `layer3_sophistication_score` | number | Aggregate sophistication score 0.00-1.00 |
| `layer3_design_quality_score` | number | Design quality signal score 0.00-1.00 |
| `layer3_design_quality_detected` | boolean | `true` if design quality signal above threshold |
| `layer3_authority_score` | number | Authority indicators signal score 0.00-1.00 |
| `layer3_authority_detected` | boolean | `true` if authority signal above threshold |
| `layer3_presentation_score` | number | Professional presentation signal score 0.00-1.00 |
| `layer3_presentation_detected` | boolean | `true` if presentation signal above threshold |
| `layer3_content_originality_score` | number | Content originality signal score 0.00-1.00 |
| `layer3_content_originality_detected` | boolean | `true` if originality signal above threshold |
| `layer3_llm_provider` | enum | LLM provider used: `openai`, `anthropic`, `gemini` |
| `layer3_llm_cost` | number | LLM API cost in USD (4 decimal places) |
| `layer3_reasoning` | string | Human-readable LLM explanation of classification |

### Metadata (4 columns)
| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| `job_id` | string | UUID of the job that processed this URL |
| `job_name` | string | Human-readable job name |
| `processed_at` | timestamp | ISO 8601 timestamp when URL was processed (e.g., "2025-11-13T14:30:45.123Z") |
| `url_id` | string | UUID of the URL record in database |

---

## Export Format Options

### 1. Complete Results (Default)
**Description:** All 48 columns included
**Use Case:** Comprehensive analysis and archival
**File Naming:** `{job_name}_complete_{timestamp}.csv`

### 2. Summary View
**Description:** Core columns only (7 columns)
**Included Columns:**
- url, final_decision, confidence_score, confidence_band, eliminated_at_layer, processing_time_ms, total_cost
**Use Case:** Quick overview and high-level reporting
**File Naming:** `{job_name}_summary_{timestamp}.csv`

### 3. Layer 1 Results Only
**Description:** Core columns + Layer 1 columns (15 columns total)
**Use Case:** Domain analysis review and rule tuning
**File Naming:** `{job_name}_layer1_{timestamp}.csv`

### 4. Layer 2 Results Only
**Description:** Core columns + Layer 2 columns (21 columns total)
**Use Case:** Publication detection review and threshold tuning
**File Naming:** `{job_name}_layer2_{timestamp}.csv`

### 5. Layer 3 Results Only
**Description:** Core columns + Layer 3 columns (22 columns total)
**Use Case:** LLM classification review and prompt tuning
**File Naming:** `{job_name}_layer3_{timestamp}.csv`

### 6. By Decision Filter
**Description:** All columns, filtered by final_decision
**Options:**
- Accepted Only (`final_decision = 'accepted'`)
- Rejected Only (`final_decision = 'rejected'`)
- Manual Review Required Only (`final_decision = 'manual_review_required'`)
**Use Case:** Review specific decision categories
**File Naming:** `{job_name}_accepted_{timestamp}.csv`, etc.

### 7. By Confidence Band Filter
**Description:** All columns, filtered by confidence_band
**Options:** Filter by any configured confidence band (e.g., "high", "medium", "low")
**Use Case:** Review borderline classifications
**File Naming:** `{job_name}_medium_confidence_{timestamp}.csv`

---

## Example CSV Rows

### Header Row
```csv
url,final_decision,confidence_score,confidence_band,eliminated_at_layer,processing_time_ms,total_cost,layer1_passed,layer1_processing_time_ms,layer1_tld_type,layer1_tld_passed,layer1_domain_classification,layer1_url_pattern_match,layer1_target_profile,layer1_reasoning,layer2_passed,layer2_processing_time_ms,layer2_publication_score,layer2_product_offering_score,layer2_layout_score,layer2_navigation_score,layer2_monetization_score,layer2_has_product_offering,layer2_product_keywords,layer2_layout_type,layer2_business_nav_percentage,layer2_monetization_type,layer2_ad_networks,layer2_reasoning,layer3_passed,layer3_processing_time_ms,layer3_classification,layer3_sophistication_score,layer3_design_quality_score,layer3_design_quality_detected,layer3_authority_score,layer3_authority_detected,layer3_presentation_score,layer3_presentation_detected,layer3_content_originality_score,layer3_content_originality_detected,layer3_llm_provider,layer3_llm_cost,layer3_reasoning,job_id,job_name,processed_at,url_id
```

### Example 1: URL Eliminated at Layer 1
```csv
https://blog.example.com/article,rejected,0.00,auto_reject,layer1,45,0.0000,false,45,com,true,personal_blog,blog.example.com,negative,"Domain matches blog subdomain pattern 'blog.example.com' - likely personal/company blog infrastructure",,,,,,,,,,,,,,false,,,,,,,,,,,,,,,"550e8400-e29b-41d4-a716-446655440000","Tech Vendor Analysis - Nov 2025","2025-11-13T14:30:45.123Z","660e8400-e29b-41d4-a716-446655440001"
```

### Example 2: URL Eliminated at Layer 2
```csv
https://techcrunch.com,rejected,0.00,auto_reject,layer2,1235,0.0012,true,45,com,true,digital_native,,neutral,"Domain passed Layer 1 checks - commercial TLD with digital-native indicators",false,1190,0.87,0.92,0.95,0.78,0.84,false,"",blog,0.12,ads,"googlesyndication,doubleclick","Publication score 0.87 exceeds threshold 0.65. Blog layout detected (95% confidence). Low business navigation (12%). Ad monetization detected. Clear content publication site.","550e8400-e29b-41d4-a716-446655440000","Tech Vendor Analysis - Nov 2025","2025-11-13T14:30:47.456Z","660e8400-e29b-41d4-a716-446655440002"
```

### Example 3: URL Classified at Layer 3 (Accepted)
```csv
https://stripe.com,accepted,0.92,high,passed_all,3420,0.0034,true,45,com,true,digital_native,,positive,"Domain passed Layer 1 checks - commercial TLD with strong digital-native indicators (payments, fintech)",true,1190,0.23,0.95,0.08,0.89,0.12,true,"pricing,demo,api,developers,enterprise",marketing,0.89,business,"","Publication score 0.23 below threshold 0.65. Strong product offering (95%). Marketing layout. High business navigation (89%). Business monetization model. Clear product/service focus.",true,2185,suitable,0.92,0.94,true,0.91,true,0.95,true,0.89,true,openai,0.0022,"Highly sophisticated fintech platform. Exceptional design quality with polished UI, comprehensive developer documentation, and clear product positioning. Strong authority indicators including industry recognition, security certifications, and global payment partnerships. Professional presentation with consistent branding and enterprise-grade features. Original content with detailed technical documentation and case studies.","550e8400-e29b-41d4-a716-446655440000","Tech Vendor Analysis - Nov 2025","2025-11-13T14:30:50.789Z","660e8400-e29b-41d4-a716-446655440003"
```

### Example 4: URL Classified at Layer 3 (Rejected)
```csv
https://cheapwebhost.info,rejected,0.18,low,passed_all,3156,0.0031,true,42,info,true,traditional,,neutral,"Domain passed Layer 1 checks - commercial TLD",true,1089,0.34,0.78,0.15,0.67,0.42,true,"pricing,buy,plans",marketing,0.67,business,"","Publication score 0.34 below threshold 0.65. Product offering detected (78%). Marketing layout but low quality. Business navigation present (67%). Business monetization model.",false,2025,not_suitable,0.18,0.15,false,0.12,false,0.22,false,0.23,false,openai,0.0020,"Low sophistication budget hosting site. Poor design quality with dated UI, excessive visual clutter, and inconsistent layout. Weak authority indicators with no notable partnerships or certifications. Unprofessional presentation with aggressive pricing tactics and low-quality imagery. Generic content with minimal originality and thin service descriptions.","550e8400-e29b-41d4-a716-446655440000","Tech Vendor Analysis - Nov 2025","2025-11-13T14:30:54.012Z","660e8400-e29b-41d4-a716-446655440004"
```

---

## Column Descriptions (Detailed)

### Core Columns

#### `url` (string)
- **Description:** Original URL submitted for classification
- **Format:** Full URL including protocol (https://)
- **Example:** `https://stripe.com`
- **Notes:** This is the input URL, not the final URL after redirects

#### `final_decision` (enum)
- **Description:** Final classification result for this URL
- **Possible Values:**
  - `accepted` - URL passed all layers and was accepted (auto or manual)
  - `rejected` - URL was rejected (eliminated at Layer 1/2, failed Layer 3, or manually rejected)
  - `manual_review_required` - URL requires manual review (routed to queue)
  - `queue_overflow` - URL rejected due to manual review queue capacity limits
  - `processing_error` - URL encountered a technical error during processing
- **Business Logic:**
  - Layer 1/2 eliminations always result in `rejected`
  - Layer 3 classifications route based on confidence bands
  - Manual review decisions override automatic classifications

#### `confidence_score` (number)
- **Description:** Final confidence score from Layer 3 LLM classification
- **Range:** 0.00 to 1.00 (2 decimal places)
- **Example:** `0.92` (92% confidence)
- **Notes:** Only populated if URL reached Layer 3. Empty/0.00 if eliminated at Layer 1 or 2

#### `confidence_band` (string)
- **Description:** Named confidence band this score falls into
- **Example Values:** `high`, `medium`, `low`, `auto_reject`
- **Notes:** Bands are configurable in classification settings. Band determines routing action (auto-approve, manual review, or reject)

#### `eliminated_at_layer` (enum)
- **Description:** Layer where URL was eliminated from the pipeline
- **Possible Values:**
  - `layer1` - Eliminated at domain analysis
  - `layer2` - Eliminated at publication detection
  - `layer3` - Classified as not suitable by LLM
  - `passed_all` - Passed all layers (accepted or queued for manual review)
  - `null` - Processing error (check final_decision for details)
- **Notes:** Use this to understand funnel drop-off and layer effectiveness

#### `processing_time_ms` (integer)
- **Description:** Total processing time across all layers in milliseconds
- **Calculation:** `layer1_processing_time_ms + layer2_processing_time_ms + layer3_processing_time_ms`
- **Example:** `3420` (3.42 seconds total)
- **Notes:** Useful for performance analysis and cost estimation

#### `total_cost` (number)
- **Description:** Total processing cost in USD
- **Format:** 4 decimal places (e.g., `0.0034` = $0.0034)
- **Calculation:** Scraping cost (Layer 2) + LLM API cost (Layer 3)
- **Example:** `0.0034` ($0.0034 or ~0.34 cents)
- **Notes:** Layer 1 has no cost (local processing). Layer 2 uses ScrapingBee API. Layer 3 uses OpenAI/Anthropic/Gemini APIs

---

### Layer 1: Domain Analysis Columns

#### `layer1_passed` (boolean)
- **Description:** Whether URL passed Layer 1 domain analysis
- **Values:** `true` (passed), `false` (eliminated)
- **Business Logic:** URLs must pass Layer 1 to proceed to Layer 2

#### `layer1_processing_time_ms` (integer)
- **Description:** Time taken for Layer 1 analysis in milliseconds
- **Typical Range:** 20-100ms (local processing, no API calls)
- **Example:** `45`

#### `layer1_tld_type` (string)
- **Description:** Top-level domain extracted from URL
- **Examples:** `com`, `io`, `net`, `org`, `blog`, `info`
- **Notes:** Used to filter out non-commercial TLDs (e.g., `.blogspot`, `.wordpress`)

#### `layer1_tld_passed` (boolean)
- **Description:** Whether TLD is in commercial whitelist
- **Values:** `true` (commercial TLD), `false` (flagged TLD)
- **Business Logic:** URLs with flagged TLDs are eliminated

#### `layer1_domain_classification` (enum)
- **Description:** Classification of domain based on keywords
- **Possible Values:**
  - `digital_native` - Digital-first companies (e.g., SaaS, cloud, API keywords)
  - `traditional` - Traditional businesses (e.g., manufacturing, retail keywords)
  - `personal_blog` - Personal or company blog infrastructure
  - `unknown` - Could not classify
- **Example Keywords:**
  - Digital native: "cloud", "api", "platform", "software", "saas"
  - Traditional: "manufacturing", "retail", "wholesale", "industrial"

#### `layer1_url_pattern_match` (string)
- **Description:** Exclusion pattern that matched this URL (if any)
- **Examples:**
  - `blog.example.com` (blog subdomain)
  - `/tag/` (tag page)
  - `/author/` (author page)
  - Empty string if no pattern matched
- **Notes:** URLs matching exclusion patterns are eliminated

#### `layer1_target_profile` (enum)
- **Description:** Whether domain matches target profile indicators
- **Possible Values:**
  - `positive` - Matches positive indicators (e.g., enterprise keywords, tech stack)
  - `negative` - Matches negative indicators (e.g., news, sports, personal)
  - `neutral` - No strong indicators either way
- **Business Logic:** Negative profile matches are eliminated

#### `layer1_reasoning` (string)
- **Description:** Human-readable explanation of Layer 1 decision
- **Format:** Plain text, typically 1-2 sentences
- **Example:** `"Domain matches blog subdomain pattern 'blog.example.com' - likely personal/company blog infrastructure"`
- **Use Case:** Helps users understand why URL was eliminated or passed

---

### Layer 2: Publication Detection Columns

#### `layer2_passed` (boolean)
- **Description:** Whether URL passed Layer 2 publication detection
- **Values:** `true` (passed), `false` (eliminated)
- **Business Logic:** URLs with publication_score >= threshold are eliminated
- **Notes:** Empty if URL was eliminated at Layer 1

#### `layer2_processing_time_ms` (integer)
- **Description:** Time taken for Layer 2 analysis in milliseconds
- **Typical Range:** 800-2000ms (includes ScrapingBee API call and HTML parsing)
- **Example:** `1190`
- **Notes:** Empty if URL was eliminated at Layer 1

#### `layer2_publication_score` (number)
- **Description:** Overall publication score (average of 4 module scores)
- **Range:** 0.00 to 1.00 (2 decimal places)
- **Calculation:** Average of product_offering, layout, navigation, and monetization scores
- **Threshold:** Typically 0.65 (configurable in settings)
- **Example:** `0.87` (87% confidence this is a publication/content site)

#### `layer2_product_offering_score` (number)
- **Description:** Score from Module 1: Product Offering Detection
- **Range:** 0.00 to 1.00
- **Signals Detected:**
  - Product/service keywords in content
  - Pricing information
  - Demo/trial offers
  - Commercial features/capabilities
- **Example:** `0.92` (strong product offering detected)

#### `layer2_layout_score` (number)
- **Description:** Score from Module 2: Homepage Layout Analysis
- **Range:** 0.00 to 1.00
- **Signals Detected:**
  - Blog-style layout (article list, post grid)
  - Marketing layout (hero section, feature blocks)
  - Mixed layout indicators
- **Example:** `0.95` (95% confidence this is blog layout)

#### `layer2_navigation_score` (number)
- **Description:** Score from Module 3: Navigation Analysis
- **Range:** 0.00 to 1.00
- **Signals Detected:**
  - Ratio of business nav items (Products, Pricing, About)
  - Ratio of content nav items (Blog, Articles, News)
  - Navigation structure and hierarchy
- **Example:** `0.78` (78% content-focused navigation)

#### `layer2_monetization_score` (number)
- **Description:** Score from Module 4: Monetization Detection
- **Range:** 0.00 to 1.00
- **Signals Detected:**
  - Ad networks (Google AdSense, DoubleClick)
  - Affiliate patterns
  - Payment providers (Stripe, PayPal)
  - Business monetization indicators
- **Example:** `0.84` (84% confidence this is ad-monetized)

#### `layer2_has_product_offering` (boolean)
- **Description:** Whether product/service offerings were detected
- **Values:** `true` (products detected), `false` (no products)
- **Notes:** Derived from product_offering_score (typically threshold 0.5)

#### `layer2_product_keywords` (string)
- **Description:** Comma-separated list of detected product keywords
- **Format:** Lowercase, comma-separated
- **Examples:**
  - `pricing,demo,api,developers,enterprise`
  - `features,capabilities,solutions`
  - Empty string if none detected
- **Notes:** Keywords from classification_settings.layer2_rules.product_keywords

#### `layer2_layout_type` (enum)
- **Description:** Detected homepage layout type
- **Possible Values:**
  - `blog` - Blog-style layout (article list, post grid, publication indicators)
  - `marketing` - Marketing site layout (hero, features, CTAs)
  - `mixed` - Mixed indicators (both blog and marketing elements)
- **Business Logic:** `blog` layout contributes heavily to publication_score

#### `layer2_business_nav_percentage` (number)
- **Description:** Percentage of navigation items classified as business-focused
- **Range:** 0.00 to 1.00 (2 decimal places)
- **Calculation:** business_nav_count / total_nav_count
- **Example:** `0.89` (89% business navigation)
- **Threshold:** Typically 0.30 (30%) minimum for product/service sites
- **Notes:** High percentage indicates product site, low indicates content site

#### `layer2_monetization_type` (enum)
- **Description:** Primary monetization model detected
- **Possible Values:**
  - `ads` - Ad-based (Google AdSense, display ads)
  - `affiliates` - Affiliate marketing (Amazon, commission links)
  - `business` - Product/service sales (payment processors)
  - `mixed` - Multiple monetization models
  - `unknown` - Could not determine
- **Business Logic:** `ads` and `affiliates` indicate content sites

#### `layer2_ad_networks` (string)
- **Description:** Comma-separated list of detected ad networks
- **Format:** Lowercase, comma-separated
- **Examples:**
  - `googlesyndication,doubleclick`
  - `adsense,amazon-adsystem`
  - Empty string if none detected
- **Notes:** Presence of ad networks strongly indicates content site

#### `layer2_reasoning` (string)
- **Description:** Human-readable explanation of Layer 2 decision
- **Format:** Plain text, typically 2-4 sentences
- **Example:** `"Publication score 0.87 exceeds threshold 0.65. Blog layout detected (95% confidence). Low business navigation (12%). Ad monetization detected. Clear content publication site."`
- **Use Case:** Helps users understand publication detection logic

---

### Layer 3: LLM Classification Columns

#### `layer3_passed` (boolean)
- **Description:** Whether URL was classified as suitable by LLM
- **Values:** `true` (suitable), `false` (not suitable)
- **Business Logic:** Based on sophistication_score and LLM classification
- **Notes:** Empty if URL was eliminated at Layer 1 or 2

#### `layer3_processing_time_ms` (integer)
- **Description:** Time taken for Layer 3 LLM classification in milliseconds
- **Typical Range:** 1500-4000ms (includes LLM API call and response parsing)
- **Example:** `2185`
- **Notes:** Empty if URL was eliminated at Layer 1 or 2

#### `layer3_classification` (enum)
- **Description:** LLM's classification of the website
- **Possible Values:**
  - `suitable` - Website meets sophistication criteria
  - `not_suitable` - Website does not meet criteria
- **Business Logic:** Drives final routing decision based on confidence bands

#### `layer3_sophistication_score` (number)
- **Description:** Aggregate sophistication score (weighted average of 4 signals)
- **Range:** 0.00 to 1.00 (2 decimal places)
- **Calculation:** Weighted average using configured signal weights
- **Example:** `0.92` (92% confidence in high sophistication)
- **Notes:** This score is used for confidence band routing

#### `layer3_design_quality_score` (number)
- **Description:** Score for design quality sophistication signal
- **Range:** 0.00 to 1.00
- **Signals:**
  - Modern UI/UX design
  - Consistent branding
  - Professional color palette
  - Responsive layout quality
- **Example:** `0.94`

#### `layer3_design_quality_detected` (boolean)
- **Description:** Whether design quality signal exceeded threshold
- **Values:** `true` (signal detected), `false` (below threshold)
- **Threshold:** Typically 0.6 (configurable in settings)

#### `layer3_authority_score` (number)
- **Description:** Score for authority indicators sophistication signal
- **Range:** 0.00 to 1.00
- **Signals:**
  - Industry recognition and awards
  - Customer testimonials and case studies
  - Security certifications (SOC2, ISO)
  - Notable partnerships and integrations
- **Example:** `0.91`

#### `layer3_authority_detected` (boolean)
- **Description:** Whether authority signal exceeded threshold
- **Values:** `true` (signal detected), `false` (below threshold)

#### `layer3_presentation_score` (number)
- **Description:** Score for professional presentation sophistication signal
- **Range:** 0.00 to 1.00
- **Signals:**
  - Professional copywriting
  - High-quality imagery and media
  - Clear value proposition
  - Polished content presentation
- **Example:** `0.95`

#### `layer3_presentation_detected` (boolean)
- **Description:** Whether presentation signal exceeded threshold
- **Values:** `true` (signal detected), `false` (below threshold)

#### `layer3_content_originality_score` (number)
- **Description:** Score for content originality sophistication signal
- **Range:** 0.00 to 1.00
- **Signals:**
  - Original research and insights
  - Unique value propositions
  - Proprietary methodologies
  - Deep technical documentation
- **Example:** `0.89`

#### `layer3_content_originality_detected` (boolean)
- **Description:** Whether originality signal exceeded threshold
- **Values:** `true` (signal detected), `false` (below threshold)

#### `layer3_llm_provider` (enum)
- **Description:** LLM provider used for this classification
- **Possible Values:**
  - `openai` - OpenAI GPT-4
  - `anthropic` - Anthropic Claude
  - `gemini` - Google Gemini
- **Notes:** Provider selection based on classification_settings configuration

#### `layer3_llm_cost` (number)
- **Description:** LLM API cost for this classification in USD
- **Format:** 4 decimal places (e.g., `0.0022`)
- **Calculation:** Input tokens * input_price + output tokens * output_price
- **Example:** `0.0022` ($0.0022 or ~0.22 cents)
- **Notes:** Cost varies by provider and token usage

#### `layer3_reasoning` (string)
- **Description:** LLM's detailed explanation of classification decision
- **Format:** Plain text, typically 3-5 sentences
- **Example:** `"Highly sophisticated fintech platform. Exceptional design quality with polished UI, comprehensive developer documentation, and clear product positioning. Strong authority indicators including industry recognition, security certifications, and global payment partnerships. Professional presentation with consistent branding and enterprise-grade features. Original content with detailed technical documentation and case studies."`
- **Use Case:** Primary field for understanding LLM decision-making
- **Notes:** This is the most important field for manual review and validation

---

### Metadata Columns

#### `job_id` (string)
- **Description:** UUID of the job that processed this URL
- **Format:** UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- **Use Case:** Link back to job record, group URLs by processing batch

#### `job_name` (string)
- **Description:** Human-readable name of the job
- **Format:** Free text (e.g., `"Tech Vendor Analysis - Nov 2025"`)
- **Use Case:** Easy identification of job in file exports and reports

#### `processed_at` (timestamp)
- **Description:** Timestamp when URL processing completed
- **Format:** ISO 8601 with milliseconds (e.g., `"2025-11-13T14:30:45.123Z"`)
- **Timezone:** UTC
- **Use Case:** Audit trail, chronological sorting, time-based analysis

#### `url_id` (string)
- **Description:** UUID of the URL record in database
- **Format:** UUID v4 (e.g., `660e8400-e29b-41d4-a716-446655440001`)
- **Use Case:** Link to detailed records in database, troubleshooting

---

## Export Implementation Notes

### CSV Format Standards
- **Encoding:** UTF-8 with BOM (for Excel compatibility)
- **Line Endings:** CRLF (`\r\n`) for Windows/Excel compatibility
- **Delimiter:** Comma (`,`)
- **Quote Character:** Double quote (`"`)
- **Escaping:** Double quotes escaped as `""` (RFC 4180 standard)
- **Null/Empty Values:** Empty string (`""`) for null values

### Field Formatting
- **Booleans:** Lowercase `true` or `false`
- **Numbers:** No thousand separators, period (`.`) for decimals
- **Timestamps:** ISO 8601 format with Z suffix
- **URLs:** URL-encoded if necessary, no protocol removal
- **Lists:** Comma-separated (within quoted field)

### File Size Considerations
- **Large Jobs:** Jobs with 10,000+ URLs may produce 50+ MB CSV files
- **Recommendation:** Offer compression (ZIP) for files > 10 MB
- **Streaming:** Use streaming CSV generation for large exports (don't load all in memory)

### Excel Compatibility
- **Column Limit:** Excel supports 16,384 columns (we use 48, well under limit)
- **Row Limit:** Excel 2016+ supports 1,048,576 rows
- **Date Handling:** Use ISO 8601 format for consistent parsing
- **Number Formatting:** Avoid scientific notation for large numbers (UUIDs as strings)

### Performance Targets
- **Generation Speed:** 1,000 rows/second minimum
- **Memory Usage:** < 100 MB for 10,000 rows
- **Download Time:** Provide progress indicator for exports > 5 seconds

---

## User Workflows

### Workflow 1: Manual Review in Excel
1. User exports "Manual Review Required" filter
2. Opens CSV in Excel/Google Sheets
3. Reviews `layer3_reasoning` column for each URL
4. Adds custom column for "My Decision" (Accept/Reject)
5. Sorts/filters by confidence_band or sophistication_score
6. Makes bulk decisions on borderline cases
7. Re-imports decisions into application (future feature)

### Workflow 2: Rule Tuning Analysis
1. User exports complete results for completed job
2. Creates pivot table by `eliminated_at_layer`
3. Filters `layer1_passed = false` to analyze Layer 1 rejections
4. Reviews `layer1_reasoning` to find patterns
5. Adjusts Layer 1 rules in settings based on findings
6. Repeats for Layer 2 and Layer 3

### Workflow 3: Cost Analysis
1. User exports complete results
2. Calculates total cost: `SUM(total_cost)`
3. Calculates average cost by layer:
   - Layer 1: Always $0
   - Layer 2: `AVERAGE(layer2_cost)` (scraping cost)
   - Layer 3: `AVERAGE(layer3_llm_cost)`
4. Analyzes cost-benefit of each layer
5. Adjusts pipeline settings to optimize costs

### Workflow 4: Quality Assurance
1. User exports accepted URLs only
2. Manually spot-checks 5-10% of accepted URLs
3. Looks for false positives (should have been rejected)
4. Reviews `layer3_reasoning` for questionable classifications
5. Flags URLs for manual review queue
6. Provides feedback to improve LLM prompts

---

## Future Enhancements

### Planned Features
1. **Custom Column Selection:** Allow users to choose which columns to export
2. **Excel Templates:** Pre-formatted Excel templates with formulas and pivot tables
3. **Scheduled Exports:** Automatic exports on job completion
4. **Re-import Decisions:** Bulk import user decisions from edited CSV
5. **Multi-Job Exports:** Combine results from multiple jobs into single CSV
6. **JSON Export:** Alternative JSON format for programmatic processing

### API Endpoint Design
```typescript
POST /api/jobs/{jobId}/export
Content-Type: application/json

{
  "format": "csv" | "json",
  "view": "complete" | "summary" | "layer1" | "layer2" | "layer3",
  "filters": {
    "final_decision"?: string[],
    "confidence_band"?: string[],
    "eliminated_at_layer"?: string[]
  },
  "columns"?: string[]  // Optional custom column selection
}

Response: 200 OK
Content-Type: text/csv
Content-Disposition: attachment; filename="job_name_complete_20251113_143045.csv"
```

---

## Appendix: Column Order Rationale

The 48 columns are ordered to optimize common workflows:

1. **Core Columns First (1-7):** Most frequently referenced fields
2. **Layer Order (8-36):** Follows pipeline flow (Layer 1 → 2 → 3)
3. **Metadata Last (37-40):** Contextual information, less frequently used

**Within Each Layer Section:**
- Boolean pass/fail first (quick scan)
- Timing and scoring next (performance analysis)
- Detailed signals and keywords (deep analysis)
- Reasoning last (qualitative review)

This order minimizes horizontal scrolling for common tasks while maintaining logical grouping.

---

## Version History

- **v1.0 (2025-11-13):** Initial specification with 48 columns and 7 export format options
