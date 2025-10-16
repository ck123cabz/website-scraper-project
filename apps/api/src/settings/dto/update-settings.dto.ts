import {
  IsArray,
  IsNumber,
  IsInt,
  Min,
  Max,
  ValidateNested,
  IsString,
  IsBoolean,
  IsNotEmpty,
  ArrayMinSize,
  IsOptional,
  IsObject,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  Layer1Rules,
  Layer2Rules,
  Layer3Rules,
  ConfidenceBands,
  ManualReviewSettings,
} from '@website-scraper/shared';

/**
 * Pre-filter rule with enabled flag
 */
export class PreFilterRuleDto {
  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsNotEmpty()
  pattern!: string;

  @IsString()
  @IsNotEmpty()
  reasoning!: string;

  @IsBoolean()
  enabled!: boolean;
}

/**
 * DTO for updating classification settings
 * Story 3.0: Supports both V1 and layer-structured payloads (all fields optional for partial updates)
 */
export class UpdateSettingsDto {
  // V1 fields (deprecated but still supported)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreFilterRuleDto)
  @ArrayMinSize(1, { message: 'At least one pre-filter rule is required' })
  prefilter_rules?: PreFilterRuleDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one classification indicator is required' })
  classification_indicators?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'LLM temperature must be between 0 and 1' })
  @Max(1, { message: 'LLM temperature must be between 0 and 1' })
  llm_temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Confidence threshold must be between 0 and 1' })
  @Max(1, { message: 'Confidence threshold must be between 0 and 1' })
  confidence_threshold?: number;

  @IsOptional()
  @IsInt()
  @Min(1000, { message: 'Content truncation limit must be between 1,000 and 50,000' })
  @Max(50000, { message: 'Content truncation limit must be between 1,000 and 50,000' })
  content_truncation_limit?: number;

  // 3-Tier Architecture fields (Story 3.0)
  @IsOptional()
  @IsObject()
  layer1_rules?: Layer1Rules;

  @IsOptional()
  @IsObject()
  layer2_rules?: Layer2Rules;

  @IsOptional()
  @IsObject()
  layer3_rules?: Layer3Rules;

  @IsOptional()
  @IsObject()
  confidence_bands?: ConfidenceBands;

  @IsOptional()
  @IsObject()
  manual_review_settings?: ManualReviewSettings;
}
