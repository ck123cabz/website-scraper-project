import { faker } from '@faker-js/faker';

export interface TestJob {
  url: string;
  title?: string;
  description?: string;
  tags?: string[];
}

/**
 * Pure function factory for generating test job data
 * Uses @faker-js/faker for realistic, random data
 */
export function createJobFactory() {
  return {
    /**
     * Generate a random test job
     */
    create: (overrides?: Partial<TestJob>): TestJob => {
      return {
        url: faker.internet.url(),
        title: faker.lorem.sentence(),
        description: faker.lorem.paragraph(),
        tags: [faker.word.sample(), faker.word.sample()],
        ...overrides,
      };
    },

    /**
     * Generate multiple test jobs
     */
    createMany: (count: number, overrides?: Partial<TestJob>): TestJob[] => {
      return Array.from({ length: count }, () =>
        createJobFactory().create(overrides)
      );
    },

    /**
     * Generate a job with specific URL pattern
     */
    createWithUrl: (urlPattern: string): TestJob => {
      return createJobFactory().create({ url: urlPattern });
    },
  };
}
