import { IsString, IsOptional, IsArray, ArrayMaxSize, IsUrl } from 'class-validator';

export class CreateJobDto {
  @IsString()
  @IsOptional()
  name?: string;

  // M3 Fix: Enhanced validation with max size and element-level validation
  @IsArray()
  @ArrayMaxSize(10000, { message: 'Maximum 10,000 URLs allowed per job' })
  @IsString({ each: true, message: 'Each URL must be a string' })
  @IsUrl({ require_protocol: true }, { each: true, message: 'Each URL must be a valid URL with protocol' })
  @IsOptional()
  urls?: string[];
}
