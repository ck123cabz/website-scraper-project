import { Test, TestingModule } from '@nestjs/testing';
import { Layer2OperationalFilterService } from '../layer2-operational-filter.service';
import { ScraperService } from '../../../scraper/scraper.service';
import { SettingsService } from '../../../settings/settings.service';
import * as cheerio from 'cheerio';

describe('Homepage Layout Analyzer', () => {
  let service: Layer2OperationalFilterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Layer2OperationalFilterService,
        {
          provide: ScraperService,
          useValue: { fetchUrl: jest.fn() },
        },
        {
          provide: SettingsService,
          useValue: { getSettings: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<Layer2OperationalFilterService>(Layer2OperationalFilterService);
  });

  it('should identify blog-style layouts', () => {
    const html = `
      <html>
        <body>
          <div class="posts">
            <article>
              <time datetime="2024-01-15">Jan 15, 2024</time>
              <h2>Post Title</h2>
              <p>By John Doe</p>
            </article>
            <article>
              <time datetime="2024-01-14">Jan 14, 2024</time>
              <h2>Another Post</h2>
              <p>By Jane Smith</p>
            </article>
          </div>
          <div class="pagination">Next</div>
        </body>
      </html>
    `;
    const $ = cheerio.load(html);

    const result = service['analyzeHomepageLayout']($, html);

    expect(result.homepage_is_blog).toBe(true);
    expect(result.layout_type).toBe('blog');
    expect(result.layout_confidence).toBeGreaterThan(0.7);
  });

  it('should identify marketing landing pages', () => {
    const html = `
      <html>
        <body>
          <section class="hero">
            <h1>Transform Your Business</h1>
            <p>The leading platform for...</p>
            <button>Start Free Trial</button>
          </section>
          <section class="features">
            <h2>Features</h2>
            <div class="feature">Feature 1</div>
            <div class="feature">Feature 2</div>
          </section>
          <section class="testimonials">
            <blockquote>Amazing product!</blockquote>
          </section>
        </body>
      </html>
    `;
    const $ = cheerio.load(html);

    const result = service['analyzeHomepageLayout']($, html);

    expect(result.homepage_is_blog).toBe(false);
    expect(result.layout_type).toBe('marketing');
    expect(result.layout_confidence).toBeGreaterThan(0.7);
  });

  it('should identify mixed layouts', () => {
    const html = `
      <html>
        <body>
          <section class="hero">
            <h1>Our Platform</h1>
            <button>Get Started</button>
          </section>
          <div class="features">
            <div class="feature">Feature 1</div>
          </div>
          <section class="blog">
            <h2>Latest Posts</h2>
            <article>
              <time datetime="2024-01-15">Jan 15</time>
              <h3>Post Title</h3>
            </article>
            <article>
              <time datetime="2024-01-14">Jan 14</time>
              <h3>Another Post</h3>
            </article>
          </section>
        </body>
      </html>
    `;
    const $ = cheerio.load(html);

    const result = service['analyzeHomepageLayout']($, html);

    expect(result.layout_type).toBe('mixed');
    expect(result.layout_confidence).toBeGreaterThanOrEqual(0);
    expect(result.layout_confidence).toBeLessThan(0.7);
  });
});
