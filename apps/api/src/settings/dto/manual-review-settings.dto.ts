import { IsNumber, IsBoolean, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class NotificationsDto {
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Email threshold must be at least 1' })
  email_threshold?: number;

  @IsOptional()
  @IsBoolean()
  dashboard_badge?: boolean;

  @IsOptional()
  @IsBoolean()
  slack_integration?: boolean;
}

export class ManualReviewSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Queue size limit must be at least 1' })
  queue_size_limit?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Auto review timeout days must be at least 1' })
  auto_review_timeout_days?: number | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationsDto)
  notifications?: NotificationsDto;
}
