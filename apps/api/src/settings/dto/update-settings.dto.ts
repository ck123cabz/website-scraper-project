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
} from 'class-validator';
import { Type } from 'class-transformer';

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
 */
export class UpdateSettingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreFilterRuleDto)
  @ArrayMinSize(1, { message: 'At least one pre-filter rule is required' })
  prefilter_rules!: PreFilterRuleDto[];

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one classification indicator is required' })
  classification_indicators!: string[];

  @IsNumber()
  @Min(0, { message: 'LLM temperature must be between 0 and 1' })
  @Max(1, { message: 'LLM temperature must be between 0 and 1' })
  llm_temperature!: number;

  @IsNumber()
  @Min(0, { message: 'Confidence threshold must be between 0 and 1' })
  @Max(1, { message: 'Confidence threshold must be between 0 and 1' })
  confidence_threshold!: number;

  @IsInt()
  @Min(1000, { message: 'Content truncation limit must be between 1,000 and 50,000' })
  @Max(50000, { message: 'Content truncation limit must be between 1,000 and 50,000' })
  content_truncation_limit!: number;
}
