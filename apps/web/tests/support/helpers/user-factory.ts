import { faker } from '@faker-js/faker';

export interface TestUser {
  email: string;
  password: string;
  name: string;
}

/**
 * Pure function factory for generating test user data
 * Uses @faker-js/faker for realistic, random data
 */
export function createUserFactory() {
  return {
    /**
     * Generate a random test user
     */
    create: (overrides?: Partial<TestUser>): TestUser => {
      return {
        email: faker.internet.email(),
        password: faker.internet.password({ length: 12 }),
        name: faker.person.fullName(),
        ...overrides,
      };
    },

    /**
     * Generate multiple test users
     */
    createMany: (count: number, overrides?: Partial<TestUser>): TestUser[] => {
      return Array.from({ length: count }, () =>
        createUserFactory().create(overrides)
      );
    },
  };
}
