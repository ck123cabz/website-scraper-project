# Test Data for 3-Tier Filtering System

This directory contains comprehensive test CSV files for validating the website scraper's 3-tier filtering system.

## 📋 Test Files Overview

### 1. Layer 1: Domain Rejections
**File:** `1-layer1-domain-rejections.csv` (32 URLs)

Tests URLs that should be **rejected at Layer 1** based on domain analysis rules:
- **Blog Platforms:** Medium, WordPress, Blogspot, Substack, Ghost, Wix, Squarespace, Tumblr
- **Social Media:** Facebook, Twitter/X, LinkedIn, Instagram, TikTok, YouTube, Reddit, Pinterest, Snapchat
- **E-commerce:** Amazon, eBay, Etsy, Shopify, AliExpress, Walmart, Target
- **Non-commercial TLDs:** .org, .edu, .gov domains
- **Q&A Platforms:** Quora, Stack Overflow

**Expected Result:** All should show `rejected_prefilter` with `elimination_layer: layer1`

### 2. Layer 2: Operational Filters
**File:** `2-layer2-operational-filters.csv` (6 URLs)

Tests URLs that pass Layer 1 but should **fail Layer 2** operational filters:
- Minimal content sites (example.com)
- Parked domains
- Under construction sites
- Coming soon pages
- Test/placeholder sites

**Expected Result:** Should show `rejected_prefilter` with `elimination_layer: layer2`

### 3. Layer 3: Suitable for Guest Posts
**File:** `3-layer3-suitable-guest-posts.csv` (20 URLs)

Tests URLs that should **pass all layers** and be classified as **suitable** for guest post opportunities:
- Marketing blogs (Copyblogger, HubSpot, Neil Patel)
- SEO blogs (Moz, Backlinko, Ahrefs, Search Engine Journal)
- Social media marketing (Buffer, Social Media Examiner)
- Content marketing (Content Marketing Institute)
- Blogging tips (ProBlogger, Lifehacker)
- Design & development (Smashing Magazine)

**Expected Result:** `classification_result: suitable` with confidence scores

### 4. Layer 3: Not Suitable for Guest Posts
**File:** `4-layer3-not-suitable-guest-posts.csv` (43 URLs)

Tests URLs that pass Layers 1 & 2 but should be classified as **not suitable**:
- **Major News/Magazines:** Forbes, Entrepreneur, Inc, Fast Company, TechCrunch, Mashable, HuffPost, CNN, BBC, NYTimes, WSJ, Reuters, Bloomberg, Time, Newsweek, Wired, The Verge
- **Product Companies:** Apple, Microsoft, Google
- **Services:** Netflix, Spotify, Uber, Airbnb, Booking.com
- **Retail:** Best Buy, Home Depot, Lowe's, Kohl's, Macy's, Nordstrom, Gap, Nike, Adidas
- **Chains:** Starbucks, McDonald's, Subway
- **Real Estate:** Zillow, Realtor.com
- **Auto:** CarMax, AutoTrader

**Expected Result:** `classification_result: not_suitable` with reasoning

### 5. Edge Cases & Validation
**File:** `5-edge-cases-validation.csv` (35 URLs)

Tests various edge cases and validation scenarios:
- **Duplicates:** Same URL with/without www, HTTP vs HTTPS, different cases
- **URL Variations:** Trailing slashes, query strings, fragments, custom ports, subdomains
- **Shorteners:** bit.ly, tinyurl.com, goo.gl
- **Invalid Protocols:** FTP, mailto, javascript, file
- **Invalid Formats:** Localhost, IP addresses, malformed URLs, XSS attempts, SQL injection

**Expected Result:** Mix of valid handling and proper rejection of invalid URLs

### 6. Mixed Comprehensive Test
**File:** `6-mixed-comprehensive-test.csv` (25 URLs)

A balanced mix of all scenarios for end-to-end testing:
- 4 Layer 1 rejections
- 10 suitable sites
- 11 not suitable sites

**Purpose:** Quick comprehensive test covering all filtering tiers

## 🧪 How to Use These Tests

### Method 1: Upload via Web Interface
1. Navigate to http://localhost:3000/jobs/new
2. Upload any of the CSV test files
3. Monitor the job progress
4. Review results in the Results tab
5. Expand rows to see detailed filtering journey

### Method 2: Manual Testing
1. Copy URLs from any test file
2. Paste into the manual URL entry form
3. Run the job
4. Verify results match expected outcomes

### Method 3: Automated Testing
```bash
# Run each test file through the API
for file in test-data/*.csv; do
  echo "Testing: $file"
  # Upload via API and verify results
done
```

## ✅ Validation Checklist

For each test file, verify:

### Layer 1 Tests (File 1)
- [ ] All URLs are rejected with `status: rejected`
- [ ] All have `classification_result: rejected_prefilter`
- [ ] All have `elimination_layer: layer1`
- [ ] `layer1_reasoning` matches the expected rule (blog platform, social media, TLD, etc.)
- [ ] Processing time is very fast (< 1 second per URL)
- [ ] No LLM costs incurred (`llm_cost: 0` or `null`)

### Layer 2 Tests (File 2)
- [ ] All URLs show `elimination_layer: layer2`
- [ ] Proper prefilter reasoning is provided
- [ ] Still minimal to no LLM costs

### Layer 3 Suitable Tests (File 3)
- [ ] All URLs have `status: success`
- [ ] All have `classification_result: suitable`
- [ ] Confidence scores are reasonable (typically 60-95%)
- [ ] `classification_reasoning` explains why suitable
- [ ] `confidence_band` is set appropriately
- [ ] LLM costs are recorded
- [ ] Processing time includes scraping + LLM analysis

### Layer 3 Not Suitable Tests (File 4)
- [ ] All URLs have `status: success`
- [ ] All have `classification_result: not_suitable`
- [ ] Clear reasoning why not suitable for guest posts
- [ ] Confidence scores match expectations
- [ ] Proper LLM costs recorded

### Edge Cases Tests (File 5)
- [ ] Invalid URLs are handled gracefully (not crashing the system)
- [ ] Duplicates are processed (deduplication is a future feature)
- [ ] URL normalizations work correctly
- [ ] No security vulnerabilities from malicious inputs

### Mixed Tests (File 6)
- [ ] All categories process correctly in a single job
- [ ] Results match individual file expectations
- [ ] Real-time updates work smoothly
- [ ] Export functionality works for mixed results

## 📊 Expected Performance Metrics

### Layer 1 Rejections
- **Processing Time:** < 1 second per URL
- **LLM Cost:** $0.00 (no LLM calls)
- **Success Rate:** 100% rejection accuracy

### Layer 2 Rejections
- **Processing Time:** 3-8 seconds per URL (includes scraping)
- **LLM Cost:** $0.00 (no LLM calls)
- **Success Rate:** High rejection accuracy on operational criteria

### Layer 3 Classifications
- **Processing Time:** 10-20 seconds per URL (scraping + LLM)
- **LLM Cost:** $0.001-0.005 per URL (varies by content length)
- **Success Rate:** 80-90%+ classification accuracy

## 🐛 Common Issues to Watch For

1. **False Positives:** Layer 1 rejecting legitimate business sites
2. **False Negatives:** Not suitable sites classified as suitable
3. **Timeout Errors:** Sites that take too long to scrape
4. **Rate Limiting:** Too many requests in short time
5. **Confidence Mismatches:** High confidence on wrong classifications
6. **Missing Data:** Layer reasoning fields not populated

## 📝 Notes

- **Test Data Last Updated:** November 10, 2025
- **Classification Criteria:** Based on guest post opportunities, not general content quality
- **News/Magazines Clarification:** Major news sites and magazines are classified as "not suitable" because they typically have strict editorial control and don't accept unsolicited guest posts
- **Suitable Sites:** Focus on marketing blogs, SEO resources, and industry-specific content sites that actively seek contributor content

## 🔄 Maintaining Test Data

Update these test files when:
- New Layer 1 rules are added
- Layer 2 operational criteria change
- Classification prompts are modified
- New edge cases are discovered
- Real-world false positives/negatives are identified

---

**Pro Tip:** Start with `6-mixed-comprehensive-test.csv` for quick validation, then use specific test files to debug issues in particular layers.
