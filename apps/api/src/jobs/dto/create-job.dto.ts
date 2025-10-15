import { IsString, IsOptional, IsArray, ArrayMaxSize } from 'class-validator';

export class CreateJobDto {
  @IsString()
  @IsOptional()
  name?: string;

  // M3 Fix: Enhanced validation with max size and element-level validation
  // Note: URL format validation and normalization happens in UrlValidationService
  // to allow flexible input (e.g., "example.com" gets normalized to "https://example.com")
  @IsArray()
  @ArrayMaxSize(10000, { message: 'Maximum 10,000 URLs allowed per job' })
  @IsString({ each: true, message: 'Each URL must be a string' })
  @IsOptional()
  urls?: string[];
}
