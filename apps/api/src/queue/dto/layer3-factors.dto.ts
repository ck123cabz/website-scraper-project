import {
  IsEnum,
  IsNumber,
  IsString,
  IsArray,
  IsNotEmpty,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for Layer 3 Sophistication Signal Detail
 * Part of batch processing refactor Phase 2 (Task T014)
 */
class SophisticationSignalDetailDto {
  @IsNumber()
  @Min(0)
  score: number;

  @IsArray()
  @IsString({ each: true })
  indicators: string[];
}

/**
 * DTO for Layer 3 Sophistication Signals
 * Part of batch processing refactor Phase 2 (Task T014)
 */
class SophisticationSignalsDto {
  @ValidateNested()
  @Type(() => SophisticationSignalDetailDto)
  design_quality: SophisticationSignalDetailDto;

  @ValidateNested()
  @Type(() => SophisticationSignalDetailDto)
  authority_indicators: SophisticationSignalDetailDto;

  @ValidateNested()
  @Type(() => SophisticationSignalDetailDto)
  professional_presentation: SophisticationSignalDetailDto;

  @ValidateNested()
  @Type(() => SophisticationSignalDetailDto)
  content_originality: SophisticationSignalDetailDto;
}

/**
 * DTO for Layer 3 Token Usage
 * Part of batch processing refactor Phase 2 (Task T014)
 */
class TokenUsageDto {
  @IsNumber()
  @Min(0)
  input: number;

  @IsNumber()
  @Min(0)
  output: number;
}

/**
 * DTO for Layer 3 Sophistication Analysis Factors
 * Part of batch processing refactor Phase 2 (Task T014)
 *
 * Validates Layer 3 factor data before writing to url_results.layer3_factors JSONB column
 *
 * Corresponds to:
 * - Database: supabase/migrations/20251113000001_add_layer_factors.sql
 * - Schema: specs/001-batch-processing-refactor/data-model.md (lines 147-234)
 * - Shared types: packages/shared/src/types/url-results.ts (Layer3Factors interface)
 */
export class Layer3FactorsDto {
  @IsEnum(['accepted', 'rejected'])
  @IsNotEmpty()
  classification: 'accepted' | 'rejected';

  @ValidateNested()
  @Type(() => SophisticationSignalsDto)
  sophistication_signals: SophisticationSignalsDto;

  @IsString()
  @IsNotEmpty()
  llm_provider: string;

  @IsString()
  @IsNotEmpty()
  model_version: string;

  @IsNumber()
  @Min(0)
  cost_usd: number;

  @IsString()
  @IsNotEmpty()
  reasoning: string;

  @ValidateNested()
  @Type(() => TokenUsageDto)
  tokens_used: TokenUsageDto;

  @IsNumber()
  @Min(0)
  processing_time_ms: number;
}
