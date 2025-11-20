import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * @deprecated DTO for manual review settings - System removed in Phase 7, US5
 * Manual review system has been removed from the codebase.
 * This DTO is kept temporarily for backward compatibility with existing settings records.
 * All URLs now process through Layer 1/2/3 automatically without manual review routing.
 * Scheduled for deletion after 2 weeks of production stability (see tasks.md T100-T103).
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
