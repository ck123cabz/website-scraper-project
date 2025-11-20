import {
  IsArray,
  IsInt,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsString,
  IsBoolean,
  IsNotEmpty,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Layer1RulesDto } from './layer1-rules.dto';
import { Layer2RulesDto } from './layer2-rules.dto';
import { Layer3RulesDto } from './layer3-rules.dto';
import { ConfidenceBandsDto } from './confidence-bands.dto';
/** @deprecated Manual review system removed in Phase 7, US5 - kept for backward compatibility */
import { ManualReviewSettingsDto } from './manual-review-settings.dto';

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
  @ValidateNested()
  @Type(() => Layer1RulesDto)
  layer1_rules?: Layer1RulesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => Layer2RulesDto)
  layer2_rules?: Layer2RulesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => Layer3RulesDto)
  layer3_rules?: Layer3RulesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConfidenceBandsDto)
  confidence_bands?: ConfidenceBandsDto;

  /**
   * @deprecated Manual review system removed in Phase 7, US5
   * Kept for backward compatibility with existing settings records
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => ManualReviewSettingsDto)
  manual_review_settings?: ManualReviewSettingsDto;
}
