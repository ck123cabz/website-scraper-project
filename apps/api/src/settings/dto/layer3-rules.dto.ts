import { IsArray, IsNumber, IsInt, IsString, Min, Max, IsOptional } from 'class-validator';

export class Layer3RulesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  guest_post_red_flags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seo_investment_signals?: string[];

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'LLM temperature must be a number with max 2 decimal places' },
  )
  @Min(0, { message: 'LLM temperature must be between 0 and 1' })
  @Max(1, { message: 'LLM temperature must be between 0 and 1' })
  llm_temperature?: number;

  @IsOptional()
  @IsInt({ message: 'Content truncation limit must be an integer' })
  @Min(1000, { message: 'Content truncation limit must be between 1,000 and 50,000' })
  @Max(50000, { message: 'Content truncation limit must be between 1,000 and 50,000' })
  content_truncation_limit?: number;
}
