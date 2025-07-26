/**
 * Jest configuration for BrainBuddy
 * - Uses the jest-expo preset for React Native/Expo apps
 * - Transforms TypeScript via babel-jest
 * - Sets up jsdom environment for component testing
 * - Collects coverage information from src directory
 */
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['lcov', 'text'],
};
