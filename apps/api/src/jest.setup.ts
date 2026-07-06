// Jest setup file — runs before any test modules are imported
// Set required environment variables for testing
process.env.TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'test-encryption-key-for-jest-32ch';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-jest';
