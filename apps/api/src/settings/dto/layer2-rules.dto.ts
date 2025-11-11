import {
  IsNumber,
  IsArray,
  IsString,
  Min,
  Max,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class ProductKeywordsDto {
  @IsArray()
  @IsString({ each: true })
  commercial!: string[];

  @IsArray()
  @IsString({ each: true })
  features!: string[];

  @IsArray()
  @IsString({ each: true })
  cta!: string[];
}

export class Layer2RulesDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  publication_score_threshold?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductKeywordsDto)
  product_keywords?: ProductKeywordsDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  business_nav_keywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  content_nav_keywords?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  min_business_nav_percentage?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ad_network_patterns?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  affiliate_patterns?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  payment_provider_patterns?: string[];
}
