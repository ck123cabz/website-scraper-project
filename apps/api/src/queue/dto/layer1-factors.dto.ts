import {
  IsEnum,
  IsString,
  IsArray,
  IsBoolean,
  IsNumber,
  IsNotEmpty,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for Layer 1 Target Profile
 * Part of batch processing refactor Phase 2 (Task T012)
 */
class TargetProfileDto {
  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number;
}

/**
 * DTO for Layer 1 Domain Analysis Factors
 * Part of batch processing refactor Phase 2 (Task T012)
 *
 * Validates Layer 1 factor data before writing to url_results.layer1_factors JSONB column
 *
 * Corresponds to:
 * - Database: supabase/migrations/20251113000001_add_layer_factors.sql
 * - Schema: specs/001-batch-processing-refactor/data-model.md (lines 69-98)
 * - Shared types: packages/shared/src/types/url-results.ts (Layer1Factors interface)
 */
export class Layer1FactorsDto {
  @IsEnum(['gtld', 'cctld', 'custom'])
  @IsNotEmpty()
  tld_type!: 'gtld' | 'cctld' | 'custom';

  @IsString()
  @IsNotEmpty()
  tld_value!: string;

  @IsEnum(['commercial', 'personal', 'institutional', 'spam'])
  @IsNotEmpty()
  domain_classification!: 'commercial' | 'personal' | 'institutional' | 'spam';

  @IsArray()
  @IsString({ each: true })
  pattern_matches!: string[];

  @ValidateNested()
  @Type(() => TargetProfileDto)
  target_profile!: TargetProfileDto;

  @IsString()
  @IsNotEmpty()
  reasoning!: string;

  @IsBoolean()
  passed!: boolean;
}
