#!/usr/bin/env tsx
/**
 * Clear Metal Rate Cache Script
 * Clears cached market rate data for specific region/currency
 * 
 * Usage:
 *   npx tsx scripts/clear-metal-cache.ts [region] [currency]
 *   pnpm clear-cache NP NPR
 *   
 * Environment:
 *   API_URL - Target API endpoint (default: http://localhost:3001)
 *   ADMIN_API_TOKEN - Admin bearer token for authentication
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';
const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN;

const REGIONS = ['NP', 'IN', 'AE', 'UK', 'EU', 'US'] as const;
const CURRENCIES = ['NPR', 'INR', 'AED', 'GBP', 'EUR', 'USD'] as const;

type Region = typeof REGIONS[number];
type Currency = typeof CURRENCIES[number];

interface RefreshResponse {
  message?: string;
  error?: string;
  region?: string;
  currency?: string;
  gold24k?: number;
}

async function refreshCache(region: Region, currency: Currency): Promise<RefreshResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (ADMIN_TOKEN) {
    headers['Authorization'] = `Bearer ${ADMIN_TOKEN}`;
  }
  
  const response = await fetch(`${API_URL}/market-rates/refresh`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ region, currency }),
  });
  
  return response.json();
}

async function clearAll(): Promise<void> {
  console.log('🧹 Clearing cache for ALL regions...\n');
  
  const pairs: Array<[Region, Currency]> = [
    ['NP', 'NPR'],
    ['IN', 'INR'],
    ['AE', 'AED'],
    ['UK', 'GBP'],
    ['EU', 'EUR'],
    ['US', 'USD'],
  ];
  
  for (const [region, currency] of pairs) {
    try {
      console.log(`Refreshing ${region}:${currency}...`);
      const result = await refreshCache(region, currency);
      
      if (result.error) {
        console.log(`  ❌ Error: ${result.error}`);
      } else if (result.gold24k) {
        console.log(`  ✅ Refreshed - Gold 24K: ${result.gold24k} ${currency}/gram`);
      } else {
        console.log(`  ⚠️  Response: ${JSON.stringify(result)}`);
      }
      
      // Rate limit protection
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.log(`  ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

async function clearSingle(region: Region, currency: Currency): Promise<void> {
  console.log(`🧹 Clearing cache for ${region}:${currency}...\n`);
  
  try {
    const result = await refreshCache(region, currency);
    
    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
      process.exit(1);
    }
    
    if (result.gold24k) {
      console.log(`✅ Cache refreshed successfully!`);
      console.log(`   Region: ${region}`);
      console.log(`   Currency: ${currency}`);
      console.log(`   Gold 24K: ${result.gold24k} ${currency}/gram`);
    } else {
      console.log(`⚠️  Response: ${JSON.stringify(result, null, 2)}`);
    }
  } catch (error) {
    console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

async function main() {
  console.log('🔧 Metal Rate Cache Clear Utility');
  console.log('═'.repeat(50));
  console.log(`📍 Target: ${API_URL}`);
  console.log(`🔑 Auth: ${ADMIN_TOKEN ? 'Configured' : 'Not configured (may fail)'}`);
  console.log('═'.repeat(50));
  console.log('');

  const region = process.argv[2]?.toUpperCase() as Region | undefined;
  const currency = process.argv[3]?.toUpperCase() as Currency | undefined;

  if (!region && !currency) {
    // Clear all if no arguments
    await clearAll();
  } else if (region && currency) {
    // Validate inputs
    if (!REGIONS.includes(region)) {
      console.log(`❌ Invalid region: ${region}`);
      console.log(`   Valid regions: ${REGIONS.join(', ')}`);
      process.exit(1);
    }
    
    if (!CURRENCIES.includes(currency)) {
      console.log(`❌ Invalid currency: ${currency}`);
      console.log(`   Valid currencies: ${CURRENCIES.join(', ')}`);
      process.exit(1);
    }
    
    await clearSingle(region, currency);
  } else {
    console.log('❌ Usage: clear-metal-cache.ts [region] [currency]');
    console.log('   Examples:');
    console.log('     npx tsx scripts/clear-metal-cache.ts           # Clear all');
    console.log('     npx tsx scripts/clear-metal-cache.ts NP NPR    # Clear Nepal only');
    process.exit(1);
  }

  console.log('');
  console.log('✅ Cache clear operation complete');
}

main().catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
