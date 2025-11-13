import {
  IsArray,
  IsNumber,
  IsString,
  IsBoolean,
  Min,
  Max,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class TldFiltersDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  commercial?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  non_commercial?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  personal?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  custom?: string[];
}

class UrlPatternExclusionDto {
  @IsString()
  pattern!: string;

  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  reasoning?: string;
}

export class Layer1RulesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => TldFiltersDto)
  tld_filters?: TldFiltersDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industry_keywords?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UrlPatternExclusionDto)
  url_pattern_exclusions?: UrlPatternExclusionDto[];

  @IsOptional()
  @IsNumber()
  @Min(0.4, { message: 'Target elimination rate must be between 0.4 and 0.6' })
  @Max(0.6, { message: 'Target elimination rate must be between 0.4 and 0.6' })
  target_elimination_rate?: number;
}
