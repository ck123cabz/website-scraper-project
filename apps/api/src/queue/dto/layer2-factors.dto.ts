import {
  IsNumber,
  IsString,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for Layer 2 Module Scores
 * Part of batch processing refactor Phase 2 (Task T013)
 */
class ModuleScoresDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  product_offering!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  layout_quality!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  navigation_complexity!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  monetization_indicators!: number;
}

/**
 * DTO for Layer 2 Content Signals
 * Part of batch processing refactor Phase 2 (Task T013)
 */
class ContentSignalsDto {
  @IsBoolean()
  has_blog!: boolean;

  @IsBoolean()
  has_press_releases!: boolean;

  @IsBoolean()
  has_whitepapers!: boolean;

  @IsBoolean()
  has_case_studies!: boolean;
}

/**
 * DTO for Layer 2 Publication Detection Factors
 * Part of batch processing refactor Phase 2 (Task T013)
 *
 * Validates Layer 2 factor data before writing to url_results.layer2_factors JSONB column
 *
 * Corresponds to:
 * - Database: supabase/migrations/20251113000001_add_layer_factors.sql
 * - Schema: specs/001-batch-processing-refactor/data-model.md (lines 100-144)
 * - Shared types: packages/shared/src/types/url-results.ts (Layer2Factors interface)
 */
export class Layer2FactorsDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsNotEmpty()
  publication_score!: number;

  @ValidateNested()
  @Type(() => ModuleScoresDto)
  module_scores!: ModuleScoresDto;

  @IsArray()
  @IsString({ each: true })
  keywords_found!: string[];

  @IsArray()
  @IsString({ each: true })
  ad_networks_detected!: string[];

  @ValidateNested()
  @Type(() => ContentSignalsDto)
  content_signals!: ContentSignalsDto;

  @IsString()
  @IsNotEmpty()
  reasoning!: string;

  @IsBoolean()
  passed!: boolean;
}
