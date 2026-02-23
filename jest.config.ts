import type { Config } from 'jest';

const config: Config = {
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/src'],
      testMatch: ['**/__tests__/**/*.test.ts'],
      moduleFileExtensions: ['ts', 'js', 'json'],
      clearMocks: true,
      setupFiles: ['<rootDir>/src/__tests__/utils/setup.ts'],
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/tests'],
      testMatch: ['**/*.test.ts'],
      moduleFileExtensions: ['ts', 'js', 'json'],
      clearMocks: true,
      testTimeout: 30000,
      setupFiles: ['<rootDir>/tests/utils/setup-env.ts'],
      globals: {
        'ts-jest': {
          tsconfig: '<rootDir>/tsconfig.test.json',
        },
      },
    },
  ],
};

export default config;
