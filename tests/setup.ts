import { config } from 'dotenv';

/**
 * Test Setup
 * Configures environment and database for integration tests
 */

// Load test environment
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Global test configuration
beforeAll(async () => {
  // Wait for server startup
  await new Promise(resolve => setTimeout(resolve, 1000));
});

afterAll(async () => {
  // Graceful shutdown
  await new Promise(resolve => setTimeout(resolve, 500));
});
