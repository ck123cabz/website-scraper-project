import { IsIn, IsOptional, IsString } from 'class-validator';

/**
 * ReviewDecisionDto (Phase 3: T012)
 *
 * Request DTO for submitting a review decision on a queue entry.
 * Used in POST /api/manual-review/:id/review endpoint.
 *
 * Validation:
 * - decision: required, must be 'approved' or 'rejected'
 * - notes: optional string for reviewer comments
 *
 * Business Rule (enforced at service layer, not DTO):
 * - For rejection, notes are strongly recommended but not required here
 *   (Service layer may apply stricter requirements)
 *
 * @example
 * {
 *   "decision": "approved",
 *   "notes": "High quality site with good authority indicators"
 * }
 */
export class ReviewDecisionDto {
  /**
   * Review decision: approve or reject the queued URL
   *
   * @example 'approved'
   * @example 'rejected'
   */
  @IsIn(['approved', 'rejected'], {
    message: 'decision must be either "approved" or "rejected"',
  })
  decision!: 'approved' | 'rejected';

  /**
   * Optional notes from the reviewer
   *
   * Recommended for rejections to provide reasoning.
   * Can be used for approvals to document review notes.
   *
   * @example 'Site looks legitimate but domain age is concerning'
   */
  @IsString({
    message: 'notes must be a string',
  })
  @IsOptional()
  notes?: string;
}
