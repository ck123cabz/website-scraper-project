import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { Layer2RulesDto } from '../layer2-rules.dto';

describe('Layer2RulesDto', () => {
  it('should accept valid publication detection rules', async () => {
    const dto = plainToClass(Layer2RulesDto, {
      publication_score_threshold: 0.65,
      product_keywords: {
        commercial: ['pricing', 'buy'],
        features: ['features'],
        cta: ['get started'],
      },
      business_nav_keywords: ['product', 'pricing'],
      content_nav_keywords: ['articles', 'blog'],
      min_business_nav_percentage: 0.3,
      ad_network_patterns: ['googlesyndication'],
      affiliate_patterns: ['amazon'],
      payment_provider_patterns: ['stripe'],
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject threshold outside 0-1 range', async () => {
    const dto = plainToClass(Layer2RulesDto, {
      publication_score_threshold: 1.5,
      product_keywords: { commercial: [], features: [], cta: [] },
      business_nav_keywords: [],
      content_nav_keywords: [],
      min_business_nav_percentage: 0.3,
      ad_network_patterns: [],
      affiliate_patterns: [],
      payment_provider_patterns: [],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('publication_score_threshold');
  });

  it('should reject nav percentage outside 0-1 range', async () => {
    const dto = plainToClass(Layer2RulesDto, {
      publication_score_threshold: 0.65,
      product_keywords: { commercial: [], features: [], cta: [] },
      business_nav_keywords: [],
      content_nav_keywords: [],
      min_business_nav_percentage: 1.5,
      ad_network_patterns: [],
      affiliate_patterns: [],
      payment_provider_patterns: [],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('min_business_nav_percentage');
  });

  it('should reject threshold below 0', async () => {
    const dto = plainToClass(Layer2RulesDto, {
      publication_score_threshold: -0.1,
      product_keywords: { commercial: [], features: [], cta: [] },
      business_nav_keywords: [],
      content_nav_keywords: [],
      min_business_nav_percentage: 0.3,
      ad_network_patterns: [],
      affiliate_patterns: [],
      payment_provider_patterns: [],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('publication_score_threshold');
  });

  it('should reject nav percentage below 0', async () => {
    const dto = plainToClass(Layer2RulesDto, {
      publication_score_threshold: 0.65,
      product_keywords: { commercial: [], features: [], cta: [] },
      business_nav_keywords: [],
      content_nav_keywords: [],
      min_business_nav_percentage: -0.1,
      ad_network_patterns: [],
      affiliate_patterns: [],
      payment_provider_patterns: [],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('min_business_nav_percentage');
  });

  it('should accept threshold at boundary values 0 and 1', async () => {
    const dto1 = plainToClass(Layer2RulesDto, {
      publication_score_threshold: 0,
      product_keywords: { commercial: [], features: [], cta: [] },
      business_nav_keywords: [],
      content_nav_keywords: [],
      min_business_nav_percentage: 0,
      ad_network_patterns: [],
      affiliate_patterns: [],
      payment_provider_patterns: [],
    });

    const errors1 = await validate(dto1);
    expect(errors1).toHaveLength(0);

    const dto2 = plainToClass(Layer2RulesDto, {
      publication_score_threshold: 1,
      product_keywords: { commercial: [], features: [], cta: [] },
      business_nav_keywords: [],
      content_nav_keywords: [],
      min_business_nav_percentage: 1,
      ad_network_patterns: [],
      affiliate_patterns: [],
      payment_provider_patterns: [],
    });

    const errors2 = await validate(dto2);
    expect(errors2).toHaveLength(0);
  });
});
