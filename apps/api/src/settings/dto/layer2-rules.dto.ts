import { IsNumber, IsInt, IsArray, IsString, Min, Max, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class TechStackToolsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  analytics?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  marketing?: string[];
}

export class Layer2RulesDto {
  @IsOptional()
  @IsInt({ message: 'Blog freshness days must be an integer' })
  @Min(30, { message: 'Blog freshness days must be between 30 and 180' })
  @Max(180, { message: 'Blog freshness days must be between 30 and 180' })
  blog_freshness_days?: number;

  @IsOptional()
  @IsInt({ message: 'Required pages count must be an integer' })
  @Min(1, { message: 'Required pages count must be between 1 and 3' })
  @Max(3, { message: 'Required pages count must be between 1 and 3' })
  required_pages_count?: number;

  @IsOptional()
  @IsInt({ message: 'Minimum tech stack tools must be an integer' })
  @Min(1, { message: 'Minimum tech stack tools must be at least 1' })
  min_tech_stack_tools?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => TechStackToolsDto)
  tech_stack_tools?: TechStackToolsDto;

  @IsOptional()
  @IsInt({ message: 'Minimum design quality score must be an integer' })
  @Min(1, { message: 'Minimum design quality score must be between 1 and 10' })
  @Max(10, { message: 'Minimum design quality score must be between 1 and 10' })
  min_design_quality_score?: number;
}
