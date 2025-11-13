import { IsNumber, IsString, IsIn, Min, Max, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class ConfidenceBandConfigDto {
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Confidence band min must be between 0 and 1' })
  @Max(1, { message: 'Confidence band min must be between 0 and 1' })
  min?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Confidence band max must be between 0 and 1' })
  @Max(1, { message: 'Confidence band max must be between 0 and 1' })
  max?: number;

  @IsOptional()
  @IsString()
  @IsIn(['auto_approve', 'manual_review', 'reject'], {
    message: 'Action must be one of: auto_approve, manual_review, reject',
  })
  action?: string;
}

export class ConfidenceBandsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ConfidenceBandConfigDto)
  high?: ConfidenceBandConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConfidenceBandConfigDto)
  medium?: ConfidenceBandConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConfidenceBandConfigDto)
  low?: ConfidenceBandConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConfidenceBandConfigDto)
  auto_reject?: ConfidenceBandConfigDto;
}
