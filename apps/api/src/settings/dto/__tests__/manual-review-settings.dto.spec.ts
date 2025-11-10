import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { ManualReviewSettingsDto } from '../manual-review-settings.dto';

describe('ManualReviewSettingsDto - Validation Tests', () => {
  describe('Slack Webhook URL Validation', () => {
    it('should accept valid Slack webhook URL', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          slack_webhook_url:
            'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept another valid Slack webhook URL format', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          slack_webhook_url: 'https://hooks.slack.com/services/ABC/DEF/GHI',
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept URL without protocol (IsUrl is permissive)', async () => {
      // Note: @IsUrl from class-validator accepts URLs without protocol
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          slack_webhook_url: 'hooks.slack.com/services/T00000000/B00000000/XXXX',
        },
      });

      const errors = await validate(dto);
      // IsUrl accepts URLs without protocol, so this is valid
      expect(errors.length).toBe(0);
    });

    it('should reject malformed URL', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          slack_webhook_url: 'not a valid url at all',
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const notificationErrors = errors.find((e) => e.property === 'notifications');
      expect(notificationErrors).toBeDefined();
    });

    it('should accept null/undefined slack webhook URL (feature disabled)', async () => {
      const dtoWithNull = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          slack_webhook_url: null,
        },
      });

      const errorsNull = await validate(dtoWithNull);
      expect(errorsNull.length).toBe(0);

      const dtoWithUndefined = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          slack_webhook_url: undefined,
        },
      });

      const errorsUndefined = await validate(dtoWithUndefined);
      expect(errorsUndefined.length).toBe(0);
    });

    it('should accept omitted slack webhook URL', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          dashboard_badge: true,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should provide helpful error message for invalid Slack webhook URL', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          slack_webhook_url: 'invalid-webhook-url',
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const notificationErrors = errors.find((e) => e.property === 'notifications');
      expect(notificationErrors).toBeDefined();

      const errorMessage = JSON.stringify(notificationErrors?.constraints || notificationErrors);
      expect(errorMessage).toMatch(/valid URL|url/i);
    });
  });

  describe('Email Recipient Validation', () => {
    it('should accept valid email address', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          email_recipient: 'admin@example.com',
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept another valid email format', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          email_recipient: 'user.name+tag@company.co.uk',
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject email without domain', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          email_recipient: 'adminexample.com',
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const notificationErrors = errors.find((e) => e.property === 'notifications');
      expect(notificationErrors).toBeDefined();
    });

    it('should reject email without local part', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          email_recipient: '@example.com',
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const notificationErrors = errors.find((e) => e.property === 'notifications');
      expect(notificationErrors).toBeDefined();
    });

    it('should accept null/undefined email recipient', async () => {
      const dtoWithNull = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          email_recipient: null,
        },
      });

      const errorsNull = await validate(dtoWithNull);
      expect(errorsNull.length).toBe(0);

      const dtoWithUndefined = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          email_recipient: undefined,
        },
      });

      const errorsUndefined = await validate(dtoWithUndefined);
      expect(errorsUndefined.length).toBe(0);
    });

    it('should accept omitted email recipient', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          dashboard_badge: true,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should provide helpful error message for invalid email', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          email_recipient: 'invalid-email',
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const notificationErrors = errors.find((e) => e.property === 'notifications');
      expect(notificationErrors).toBeDefined();

      const errorMessage = JSON.stringify(notificationErrors?.constraints || notificationErrors);
      expect(errorMessage).toMatch(/valid.*email|email.*address/i);
    });
  });

  describe('Slack Threshold Validation', () => {
    it('should accept valid slack threshold', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          slack_threshold: 50,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept slack threshold of 1 (minimum)', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          slack_threshold: 1,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject slack threshold of 0', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          slack_threshold: 0,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const notificationErrors = errors.find((e) => e.property === 'notifications');
      expect(notificationErrors).toBeDefined();
    });

    it('should reject negative slack threshold', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          slack_threshold: -10,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const notificationErrors = errors.find((e) => e.property === 'notifications');
      expect(notificationErrors).toBeDefined();
    });

    it('should accept null/undefined slack threshold', async () => {
      const dtoWithNull = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          slack_threshold: null,
        },
      });

      const errorsNull = await validate(dtoWithNull);
      expect(errorsNull.length).toBe(0);

      const dtoWithUndefined = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          slack_threshold: undefined,
        },
      });

      const errorsUndefined = await validate(dtoWithUndefined);
      expect(errorsUndefined.length).toBe(0);
    });
  });

  describe('Email Threshold Validation', () => {
    it('should accept valid email threshold', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          email_threshold: 100,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept email threshold of 1 (minimum)', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          email_threshold: 1,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject email threshold of 0', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          email_threshold: 0,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const notificationErrors = errors.find((e) => e.property === 'notifications');
      expect(notificationErrors).toBeDefined();
    });

    it('should reject negative email threshold', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          email_threshold: -5,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const notificationErrors = errors.find((e) => e.property === 'notifications');
      expect(notificationErrors).toBeDefined();
    });
  });

  describe('Dashboard Badge Validation', () => {
    it('should accept dashboard_badge true', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          dashboard_badge: true,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept dashboard_badge false', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          dashboard_badge: false,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Slack Integration Flag Validation', () => {
    it('should accept slack_integration true', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          slack_integration: true,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept slack_integration false', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          slack_integration: false,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Combined Notification Settings Validation', () => {
    it('should validate all notification fields together with valid data', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          email_threshold: 50,
          email_recipient: 'admin@example.com',
          dashboard_badge: true,
          slack_integration: true,
          slack_webhook_url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXX',
          slack_threshold: 100,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate all notification fields together with null values (features disabled)', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          email_threshold: null,
          email_recipient: null,
          dashboard_badge: false,
          slack_integration: false,
          slack_webhook_url: null,
          slack_threshold: null,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject mixed valid and invalid notification fields', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          email_threshold: 50,
          email_recipient: 'invalid-email', // Invalid
          dashboard_badge: true,
          slack_integration: true,
          slack_webhook_url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXX', // Valid
          slack_threshold: 100,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const notificationErrors = errors.find((e) => e.property === 'notifications');
      expect(notificationErrors).toBeDefined();
    });
  });

  describe('ManualReviewSettingsDto Root Level Validation', () => {
    it('should accept valid queue_size_limit', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        queue_size_limit: 100,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept null queue_size_limit (no limit)', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        queue_size_limit: null,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject queue_size_limit of 0', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        queue_size_limit: 0,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept valid auto_review_timeout_days', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        auto_review_timeout_days: 30,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept null auto_review_timeout_days (no timeout)', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        auto_review_timeout_days: null,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject auto_review_timeout_days of 0', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        auto_review_timeout_days: 0,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept complete valid ManualReviewSettingsDto', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        queue_size_limit: 500,
        auto_review_timeout_days: 14,
        notifications: {
          email_threshold: 100,
          email_recipient: 'admin@example.com',
          dashboard_badge: true,
          slack_integration: true,
          slack_webhook_url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXX',
          slack_threshold: 200,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept empty ManualReviewSettingsDto (all optional)', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {});

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept ManualReviewSettingsDto with only notifications', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          slack_webhook_url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXX',
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Edge Cases and Special Scenarios', () => {
    it('should handle empty string for slack_webhook_url as invalid', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          slack_webhook_url: '',
        },
      });

      const errors = await validate(dto);
      // Empty string should be treated as invalid URL
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle empty string for email_recipient as invalid', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          email_recipient: '',
        },
      });

      const errors = await validate(dto);
      // Empty string should be treated as invalid email
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept HTTP webhook URL', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          slack_webhook_url: 'http://hooks.slack.com/services/T00000000/B00000000/XXXX',
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept webhook URL with ftp scheme (IsUrl accepts many schemes)', async () => {
      // Note: @IsUrl from class-validator accepts ftp and other schemes by default
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          slack_webhook_url: 'ftp://hooks.slack.com/services/T00000000/B00000000/XXXX',
        },
      });

      const errors = await validate(dto);
      // IsUrl accepts ftp:// scheme
      expect(errors.length).toBe(0);
    });

    it('should handle very long valid email address', async () => {
      const longEmail = 'very.long.email.address.with.many.parts+tag@subdomain.example.co.uk';
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          email_recipient: longEmail,
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle Slack URL with query parameters', async () => {
      const dto = plainToClass(ManualReviewSettingsDto, {
        notifications: {
          slack_webhook_url:
            'https://hooks.slack.com/services/T00000000/B00000000/XXXX?param=value',
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
