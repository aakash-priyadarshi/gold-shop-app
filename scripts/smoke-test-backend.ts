#!/usr/bin/env tsx
/**
 * Smoke Test Script for Backend API
 * Tests critical endpoints to verify deployment health
 * 
 * Usage: 
 *   npx tsx scripts/smoke-test-backend.ts [API_URL]
 *   pnpm smoke-test
 */

const API_URL = process.argv[2] || process.env.API_URL || 'http://localhost:3001';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  message?: string;
  response?: unknown;
}

async function runTest(
  name: string,
  testFn: () => Promise<{ passed: boolean; message?: string; response?: unknown }>
): Promise<TestResult> {
  const start = Date.now();
  try {
    const result = await testFn();
    return {
      name,
      passed: result.passed,
      duration: Date.now() - start,
      message: result.message,
      response: result.response,
    };
  } catch (error) {
    return {
      name,
      passed: false,
      duration: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testHealthEndpoint(): Promise<{ passed: boolean; message?: string; response?: unknown }> {
  const response = await fetch(`${API_URL}/health`);
  const data = await response.json();
  
  if (response.ok && data.status) {
    return {
      passed: data.status !== 'unhealthy',
      message: `Status: ${data.status}, Uptime: ${data.uptime}s`,
      response: data,
    };
  }
  
  return { passed: false, message: `HTTP ${response.status}` };
}

async function testHealthPing(): Promise<{ passed: boolean; message?: string }> {
  const response = await fetch(`${API_URL}/health/ping`);
  const data = await response.json();
  
  return {
    passed: response.ok && data.message === 'pong',
    message: data.message,
  };
}

async function testMarketRates(): Promise<{ passed: boolean; message?: string; response?: unknown }> {
  const response = await fetch(`${API_URL}/market-rates?region=NP&currency=NPR`);
  const data = await response.json();
  
  if (response.ok && data.gold24k) {
    return {
      passed: true,
      message: `Gold 24K: ${data.gold24k} ${data.currency}/gram`,
      response: data,
    };
  }
  
  return { 
    passed: false, 
    message: data.message || `HTTP ${response.status}`,
    response: data,
  };
}

async function testMarketRatesStatus(): Promise<{ passed: boolean; message?: string; response?: unknown }> {
  const response = await fetch(`${API_URL}/market-rates/status`);
  const data = await response.json();
  
  return {
    passed: response.ok,
    message: `API Key: ${data.hasApiKey ? 'Configured' : 'Not configured'}`,
    response: data,
  };
}

async function testAuthProtection(): Promise<{ passed: boolean; message?: string }> {
  const response = await fetch(`${API_URL}/auth/profile`);
  
  // Should return 401 Unauthorized without a token
  return {
    passed: response.status === 401,
    message: response.status === 401 
      ? 'Auth protection working (401 without token)'
      : `Unexpected status: ${response.status}`,
  };
}

async function testDatabaseConnectivity(): Promise<{ passed: boolean; message?: string }> {
  const response = await fetch(`${API_URL}/health/ready`);
  const data = await response.json();
  
  return {
    passed: response.ok && data.ready === true,
    message: data.ready ? 'Database ready' : 'Database not ready',
  };
}

async function main() {
  console.log('🔬 Gold Shop API Smoke Tests');
  console.log('═'.repeat(50));
  console.log(`📍 Target: ${API_URL}`);
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log('═'.repeat(50));
  console.log('');

  const tests = [
    runTest('Health Ping', testHealthPing),
    runTest('Health Check', testHealthEndpoint),
    runTest('Database Connectivity', testDatabaseConnectivity),
    runTest('Market Rates', testMarketRates),
    runTest('Market Rates Status', testMarketRatesStatus),
    runTest('Auth Protection', testAuthProtection),
  ];

  const results = await Promise.all(tests);
  
  let passed = 0;
  let failed = 0;
  let critical = false;

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? 'PASS' : 'FAIL';
    
    console.log(`${icon} ${result.name}`);
    console.log(`   Status: ${status} (${result.duration}ms)`);
    if (result.message) {
      console.log(`   Message: ${result.message}`);
    }
    console.log('');
    
    if (result.passed) {
      passed++;
    } else {
      failed++;
      // Mark as critical if health or DB fails
      if (result.name.includes('Health') || result.name.includes('Database')) {
        critical = true;
      }
    }
  }

  console.log('═'.repeat(50));
  console.log(`📊 Results: ${passed}/${results.length} passed`);
  
  if (failed > 0) {
    console.log(`❌ ${failed} test(s) failed`);
    if (critical) {
      console.log('🚨 CRITICAL: Core health checks failed!');
      process.exit(1);
    }
    process.exit(1);
  }
  
  console.log('✅ All smoke tests passed!');
  process.exit(0);
}

main().catch((error) => {
  console.error('💥 Smoke test crashed:', error);
  process.exit(1);
});
