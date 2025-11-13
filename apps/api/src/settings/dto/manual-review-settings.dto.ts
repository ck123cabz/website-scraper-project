import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * DTO for manual review settings
 */
export class ManualReviewSettingsDto {
  @IsBoolean()
  enabled!: boolean;

  @IsInt()
  @Min(0, { message: 'Auto-review timeout must be >= 0' })
  auto_review_timeout_hours!: number;

  @IsInt()
  @Min(0, { message: 'Max queue size must be >= 0' })
  max_queue_size!: number;

  @IsOptional()
  @IsString()
  slack_webhook_url?: string;

  @IsBoolean()
  enable_slack_notifications!: boolean;
}
