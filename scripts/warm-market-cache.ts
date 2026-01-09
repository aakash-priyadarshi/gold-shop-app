#!/usr/bin/env tsx
/**
 * Warm Market Rate Cache Script
 * Pre-fetches market rates for all regions to warm the cache
 * 
 * Usage:
 *   npx tsx scripts/warm-market-cache.ts
 *   pnpm warm-cache
 *   
 * Environment:
 *   API_URL - Target API endpoint (default: http://localhost:3001)
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';

const REGION_CURRENCY_PAIRS = [
  { region: 'NP', currency: 'NPR', name: 'Nepal' },
  { region: 'IN', currency: 'INR', name: 'India' },
  { region: 'AE', currency: 'AED', name: 'UAE' },
  { region: 'UK', currency: 'GBP', name: 'United Kingdom' },
  { region: 'EU', currency: 'EUR', name: 'European Union' },
  { region: 'US', currency: 'USD', name: 'United States' },
] as const;

interface MarketRateResponse {
  region?: string;
  currency?: string;
  gold24k?: number;
  gold22k?: number;
  gold21k?: number;
  gold18k?: number;
  silver?: number;
  timestamp?: string;
  source?: string;
  error?: string;
  message?: string;
}

interface WarmResult {
  region: string;
  currency: string;
  name: string;
  success: boolean;
  duration: number;
  gold24k?: number;
  error?: string;
}

async function fetchMarketRate(region: string, currency: string): Promise<MarketRateResponse> {
  const response = await fetch(
    `${API_URL}/market-rates?region=${region}&currency=${currency}`
  );
  return response.json();
}

async function warmRegion(
  region: string, 
  currency: string, 
  name: string
): Promise<WarmResult> {
  const start = Date.now();
  
  try {
    const data = await fetchMarketRate(region, currency);
    const duration = Date.now() - start;
    
    if (data.error) {
      return {
        region,
        currency,
        name,
        success: false,
        duration,
        error: data.error,
      };
    }
    
    return {
      region,
      currency,
      name,
      success: true,
      duration,
      gold24k: data.gold24k,
    };
  } catch (error) {
    return {
      region,
      currency,
      name,
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkCacheStatus(): Promise<void> {
  console.log('📊 Current Cache Status:');
  console.log('');
  
  try {
    const response = await fetch(`${API_URL}/market-rates/status`);
    const status = await response.json();
    
    console.log(`   API Key: ${status.hasApiKey ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`   Supported Regions: ${status.supportedRegions?.join(', ') || 'Unknown'}`);
    console.log(`   Supported Currencies: ${status.supportedCurrencies?.join(', ') || 'Unknown'}`);
  } catch (error) {
    console.log(`   ❌ Could not fetch status: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
  
  console.log('');
}

async function main() {
  console.log('🔥 Market Rate Cache Warming');
  console.log('═'.repeat(60));
  console.log(`📍 Target: ${API_URL}`);
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log('═'.repeat(60));
  console.log('');

  // Check current status
  await checkCacheStatus();

  console.log('🚀 Warming cache for all regions...');
  console.log('');

  const results: WarmResult[] = [];
  
  for (const { region, currency, name } of REGION_CURRENCY_PAIRS) {
    process.stdout.write(`   ${name.padEnd(20)} (${region}:${currency})... `);
    
    const result = await warmRegion(region, currency, name);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${result.gold24k?.toLocaleString()} ${currency}/g (${result.duration}ms)`);
    } else {
      console.log(`❌ ${result.error} (${result.duration}ms)`);
    }
    
    // Small delay between requests to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('');
  console.log('═'.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const avgDuration = Math.round(
    results.reduce((acc, r) => acc + r.duration, 0) / results.length
  );
  
  console.log('📊 Summary:');
  console.log(`   Successful: ${successful.length}/${results.length}`);
  console.log(`   Failed: ${failed.length}/${results.length}`);
  console.log(`   Avg Response Time: ${avgDuration}ms`);
  
  if (failed.length > 0) {
    console.log('');
    console.log('❌ Failed Regions:');
    for (const f of failed) {
      console.log(`   - ${f.name}: ${f.error}`);
    }
  }

  console.log('');
  
  if (successful.length === results.length) {
    console.log('✅ All regions warmed successfully!');
    process.exit(0);
  } else if (successful.length > 0) {
    console.log('⚠️  Some regions failed to warm');
    process.exit(0);  // Don't fail if at least some worked
  } else {
    console.log('❌ All regions failed to warm');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
