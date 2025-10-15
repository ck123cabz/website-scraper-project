-- Create classification_settings table for configurable classification parameters
-- Story 3.0: Classification Settings Management

CREATE TABLE IF NOT EXISTS classification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefilter_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  classification_indicators JSONB NOT NULL DEFAULT '[]'::jsonb,
  llm_temperature DECIMAL(3,2) NOT NULL DEFAULT 0.3 CHECK (llm_temperature >= 0 AND llm_temperature <= 1),
  confidence_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.0 CHECK (confidence_threshold >= 0 AND confidence_threshold <= 1),
  content_truncation_limit INTEGER NOT NULL DEFAULT 10000 CHECK (content_truncation_limit >= 1000 AND content_truncation_limit <= 50000),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_classification_settings_updated_at ON classification_settings(updated_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_classification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER classification_settings_updated_at
  BEFORE UPDATE ON classification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_classification_settings_updated_at();

-- Seed default settings from current hardcoded values
-- 16 pre-filter rules from apps/api/src/config/default-filter-rules.json
-- 5 classification indicators from apps/api/src/jobs/services/llm.service.ts:62-67
INSERT INTO classification_settings (
  prefilter_rules,
  classification_indicators,
  llm_temperature,
  confidence_threshold,
  content_truncation_limit
) VALUES (
  -- Pre-filter rules (16 rules, all enabled by default)
  '[
    {
      "category": "blog_platform",
      "pattern": "wordpress\\\\.com/.*",
      "reasoning": "REJECT - Blog platform domain (WordPress.com)",
      "enabled": true
    },
    {
      "category": "blog_platform",
      "pattern": "blogspot\\\\.com",
      "reasoning": "REJECT - Blog platform domain (Blogspot)",
      "enabled": true
    },
    {
      "category": "blog_platform",
      "pattern": "medium\\\\.com/@",
      "reasoning": "REJECT - Blog platform domain (Medium personal blog)",
      "enabled": true
    },
    {
      "category": "blog_platform",
      "pattern": "substack\\\\.com",
      "reasoning": "REJECT - Blog platform domain (Substack)",
      "enabled": true
    },
    {
      "category": "social_media",
      "pattern": "facebook\\\\.com",
      "reasoning": "REJECT - Social media platform (Facebook)",
      "enabled": true
    },
    {
      "category": "social_media",
      "pattern": "twitter\\\\.com",
      "reasoning": "REJECT - Social media platform (Twitter/X)",
      "enabled": true
    },
    {
      "category": "social_media",
      "pattern": "x\\\\.com",
      "reasoning": "REJECT - Social media platform (X/Twitter)",
      "enabled": true
    },
    {
      "category": "social_media",
      "pattern": "linkedin\\\\.com/in/",
      "reasoning": "REJECT - Social media profile (LinkedIn)",
      "enabled": true
    },
    {
      "category": "social_media",
      "pattern": "instagram\\\\.com",
      "reasoning": "REJECT - Social media platform (Instagram)",
      "enabled": true
    },
    {
      "category": "ecommerce",
      "pattern": "amazon\\\\.com",
      "reasoning": "REJECT - E-commerce platform (Amazon)",
      "enabled": true
    },
    {
      "category": "ecommerce",
      "pattern": "ebay\\\\.com",
      "reasoning": "REJECT - E-commerce platform (eBay)",
      "enabled": true
    },
    {
      "category": "ecommerce",
      "pattern": "shopify\\\\.com",
      "reasoning": "REJECT - E-commerce platform (Shopify)",
      "enabled": true
    },
    {
      "category": "forum",
      "pattern": "reddit\\\\.com",
      "reasoning": "REJECT - Forum/discussion platform (Reddit)",
      "enabled": true
    },
    {
      "category": "forum",
      "pattern": "quora\\\\.com",
      "reasoning": "REJECT - Q&A platform (Quora)",
      "enabled": true
    },
    {
      "category": "aggregator",
      "pattern": "wikipedia\\\\.org",
      "reasoning": "REJECT - Large knowledge aggregator (Wikipedia)",
      "enabled": true
    },
    {
      "category": "aggregator",
      "pattern": "youtube\\\\.com",
      "reasoning": "REJECT - Video aggregator (YouTube)",
      "enabled": true
    }
  ]'::jsonb,
  -- Classification indicators (5 indicators)
  '[
    "Explicit \"Write for Us\" or \"Guest Post Guidelines\" pages",
    "Author bylines with external contributors",
    "Contributor sections or editorial team listings",
    "Writing opportunities or submission guidelines",
    "Clear evidence of accepting external content"
  ]'::jsonb,
  -- LLM parameters (from llm.service.ts)
  0.3,  -- llm_temperature (line 284)
  0.0,  -- confidence_threshold (disabled by default)
  10000 -- content_truncation_limit (line 72)
) ON CONFLICT (id) DO NOTHING;
