module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/app.ts',
    '!src/config/**'
  ],
  coveragePathIgnorePatterns: ['/node_modules/'],
  testTimeout: 30000,
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  forceExit: true,
  detectOpenHandles: true
};
