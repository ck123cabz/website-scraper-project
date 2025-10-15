import { test as base } from '@playwright/test';
import { createUserFactory } from '../helpers/user-factory';
import { createJobFactory } from '../helpers/job-factory';

/**
 * Extended test fixtures for the application
 * Follows the pattern: pure function → fixture → mergeTests
 */
export type TestFixtures = {
  userFactory: ReturnType<typeof createUserFactory>;
  jobFactory: ReturnType<typeof createJobFactory>;
};

export const test = base.extend<TestFixtures>({
  /**
   * User factory fixture for generating test user data
   */
  userFactory: async ({}, use) => {
    const factory = createUserFactory();
    await use(factory);
  },

  /**
   * Job factory fixture for generating test job data
   */
  jobFactory: async ({}, use) => {
    const factory = createJobFactory();
    await use(factory);
  },
});

export { expect } from '@playwright/test';
