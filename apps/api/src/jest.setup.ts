import { webcrypto } from "crypto";

// Jest setup file — runs before any test modules are imported
// Nest's scheduler accesses the Web Crypto global during app initialization.
// Node 18 exposes it from `crypto.webcrypto`, but Jest does not install it.
if (typeof globalThis.crypto === "undefined") {
  (globalThis as any).crypto = webcrypto;
}

// Set required environment variables for testing
process.env.TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'test-encryption-key-for-jest-32ch';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-jest';
// AppModule registers the Google Passport strategy even when an E2E test does
// not exercise OAuth. Keep its bootstrap inputs deterministic alongside the
// other test-only authentication settings.
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret';
