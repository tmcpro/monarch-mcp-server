/**
 * Test setup and global configuration
 */

// Set longer timeout for integration tests
jest.setTimeout(30000);

// Mock Cloudflare Workers environment
global.crypto = {
  ...global.crypto,
  // Ensure crypto is available in test environment
} as any;

console.log('Test environment initialized');
