import { Test, TestingModule } from '@nestjs/testing';
import { ScraperService } from '../scraper.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ScraperService', () => {
  let service: ScraperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScraperService],
    }).compile();

    service = module.get<ScraperService>(ScraperService);

    // Set API key for tests
    process.env.SCRAPINGBEE_API_KEY = 'test-api-key';

    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.SCRAPINGBEE_API_KEY;
  });

  describe('fetchUrl', () => {
    it('should successfully fetch and extract content from URL', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test Page</title>
            <meta name="description" content="Test description">
          </head>
          <body>
            <h1>Welcome</h1>
            <p>This is test content.</p>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: mockHtml,
        headers: {
          'spb-final-url': 'https://example.com',
        },
      });

      const result = await service.fetchUrl('https://example.com');

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://example.com');
      expect(result.title).toBe('Test Page');
      expect(result.metaDescription).toBe('Test description');
      expect(result.content).toBe(mockHtml);
      expect(result.statusCode).toBe(200);
      expect(result.finalUrl).toBe('https://example.com');
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle 404 error', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 404,
        data: 'Not Found',
        headers: {},
      });

      const result = await service.fetchUrl('https://example.com/404');

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.error).toContain('404');
      expect(result.content).toBe('');
    });

    it('should handle timeout error', async () => {
      const timeoutError: any = new Error('timeout');
      timeoutError.code = 'ETIMEDOUT';
      mockedAxios.get.mockRejectedValue(timeoutError);

      const result = await service.fetchUrl('https://example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle 429 rate limit error', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 429,
        data: 'Rate limit exceeded',
        headers: {},
        config: {},
      });

      const result = await service.fetchUrl('https://example.com');

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(429);
      expect(result.error).toContain('429');
    });

    it('should handle 401 unauthorized error', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 401,
        data: 'Unauthorized',
        headers: {},
      });

      const result = await service.fetchUrl('https://example.com');

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toContain('401');
    });

    it('should handle network error', async () => {
      const error = new Error('Connection reset');
      (error as any).code = 'ECONNRESET';
      mockedAxios.get.mockRejectedValue(error);

      const result = await service.fetchUrl('https://example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should return error for invalid URL', async () => {
      const result = await service.fetchUrl('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL');
    });

    it('should return error when API key not configured', async () => {
      delete process.env.SCRAPINGBEE_API_KEY;

      const result = await service.fetchUrl('https://example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('API key not configured');
    });
  });

  describe('extractContent', () => {
    it('should extract title, meta description, and body text', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test Title</title>
            <meta name="description" content="Test meta description">
          </head>
          <body>
            <h1>Heading</h1>
            <p>Paragraph 1</p>
            <p>Paragraph 2</p>
          </body>
        </html>
      `;

      const result = service.extractContent(html);

      expect(result.title).toBe('Test Title');
      expect(result.metaDescription).toBe('Test meta description');
      expect(result.bodyText).toContain('Heading');
      expect(result.bodyText).toContain('Paragraph 1');
      expect(result.truncated).toBe(false);
    });

    it('should use og:title when <title> is missing', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:title" content="OG Title">
          </head>
          <body></body>
        </html>
      `;

      const result = service.extractContent(html);

      expect(result.title).toBe('OG Title');
    });

    it('should use og:description when meta description is missing', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:description" content="OG Description">
          </head>
          <body></body>
        </html>
      `;

      const result = service.extractContent(html);

      expect(result.metaDescription).toBe('OG Description');
    });

    it('should remove script and style tags from body text', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <body>
            <p>Visible text</p>
            <script>console.log('script');</script>
            <style>.hidden { display: none; }</style>
            <p>More visible text</p>
          </body>
        </html>
      `;

      const result = service.extractContent(html);

      expect(result.bodyText).toContain('Visible text');
      expect(result.bodyText).toContain('More visible text');
      expect(result.bodyText).not.toContain('script');
      expect(result.bodyText).not.toContain('console.log');
      expect(result.bodyText).not.toContain('.hidden');
    });

    it('should truncate content to 10,000 characters', () => {
      const longText = 'a'.repeat(15000);
      const html = `<html><body><p>${longText}</p></body></html>`;

      const result = service.extractContent(html);

      expect(result.bodyText.length).toBeLessThanOrEqual(10024); // 10000 + '...(truncated)'.length
      expect(result.bodyText).toContain('...(truncated)');
      expect(result.truncated).toBe(true);
    });

    it('should handle malformed HTML gracefully', () => {
      const malformedHtml =
        '<html><head><title>Test</title></head><body><p>Unclosed paragraph</body></html>';

      const result = service.extractContent(malformedHtml);

      // Should not throw, should return partial content
      expect(result.title).toBe('Test');
      expect(result.bodyText).toContain('Unclosed paragraph');
    });

    it('should return empty result for empty HTML', () => {
      const result = service.extractContent('');

      expect(result.title).toBe(null);
      expect(result.metaDescription).toBe(null);
      expect(result.bodyText).toBe('');
      expect(result.truncated).toBe(false);
    });

    it('should normalize whitespace in body text', () => {
      const html = `
        <html>
          <body>
            <p>Text    with     multiple    spaces</p>
            <p>Text
with
newlines</p>
          </body>
        </html>
      `;

      const result = service.extractContent(html);

      expect(result.bodyText).not.toContain('    ');
      expect(result.bodyText).not.toContain('\n');
      expect(result.bodyText).toContain('Text with multiple spaces');
    });
  });

  describe('isTransientError', () => {
    it('should identify timeout errors as transient', () => {
      expect(service.isTransientError('Request timeout (>30s)')).toBe(true);
      expect(service.isTransientError('ETIMEDOUT')).toBe(true);
      expect(service.isTransientError('ECONNRESET')).toBe(true);
    });

    it('should identify rate limit errors as transient', () => {
      expect(service.isTransientError('Rate limit exceeded (429)')).toBe(true);
      expect(service.isTransientError('429 Too Many Requests')).toBe(true);
    });

    it('should identify 503 errors as transient', () => {
      expect(service.isTransientError('Service unavailable (503)')).toBe(true);
      expect(service.isTransientError('503 error')).toBe(true);
    });

    it('should identify network errors as transient', () => {
      expect(service.isTransientError('Network error - could not connect')).toBe(true);
    });

    it('should identify auth errors as permanent', () => {
      expect(service.isTransientError('Unauthorized - invalid API key (401)')).toBe(false);
      expect(service.isTransientError('401 error')).toBe(false);
    });

    it('should identify bad request errors as permanent', () => {
      expect(service.isTransientError('Bad request (400)')).toBe(false);
      expect(service.isTransientError('400 error')).toBe(false);
    });

    it('should identify forbidden errors as permanent', () => {
      expect(service.isTransientError('Forbidden (403)')).toBe(false);
      expect(service.isTransientError('403 error')).toBe(false);
    });

    it('should default to transient for unknown errors', () => {
      expect(service.isTransientError('Some unknown error')).toBe(true);
    });
  });

  describe('isAvailable', () => {
    it('should return true when API key is configured', () => {
      process.env.SCRAPINGBEE_API_KEY = 'test-key';
      expect(service.isAvailable()).toBe(true);
    });

    it('should return false when API key is not configured', () => {
      delete process.env.SCRAPINGBEE_API_KEY;
      expect(service.isAvailable()).toBe(false);
    });
  });
});
