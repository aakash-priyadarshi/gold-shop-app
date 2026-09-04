import { scrapeGoogleMaps } from "./maps-scraper";
import { exportLeads } from "./exporter";
import { syncLeadsToOrivraa } from "./sync-to-orivraa";

const args = process.argv.slice(2);

function getArg(flag: string, fallback?: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith("-")) {
    return args[idx + 1];
  }
  return fallback;
}

const hasFlag = (flag: string): boolean => args.includes(flag);

async function main() {
  if (hasFlag("--help") || hasFlag("-h")) {
    console.log(`
==================================================
💎 ORIVRAA LOCAL LEAD BOT — GOOGLE MAPS & EMAIL HUNTER
==================================================

Usage: pnpm lead-bot [options]

Options:
  --query <text>     Search query for Google Maps (e.g. "jewellery shops New Road Kathmandu")
  --limit <num>      Max number of shops to extract (default: 15)
  --country <code>   ISO country code hint: NP, IN, AE, US, UK (default: NP)
  --headed           Run browser in visible mode (default: headless)
  --no-email         Skip website crawling for emails (faster, maps data only)
  --sync             Sync extracted leads directly into Orivraa Lead Management API
  --help, -h         Show this help message

Examples:
  pnpm lead-bot --query "gold jewellery shops Karol Bagh Delhi" --country IN --limit 20
  pnpm lead-bot --query "jewellers Dubai Gold Souk" --country AE --limit 30 --sync
`);
    return;
  }

  console.log("==================================================");
  console.log("💎 ORIVRAA LOCAL LEAD BOT — GOOGLE MAPS & EMAIL HUNTER");
  console.log("==================================================");

  const query = getArg("--query", "jewellery shops New Road Kathmandu");
  const rawLimit = getArg("--limit", "15");
  const parsedLimit = parseInt(rawLimit || "15", 10);
  if (isNaN(parsedLimit) || parsedLimit <= 0) {
    console.error(`❌ Error: --limit must be a positive number. Received: "${rawLimit}"`);
    process.exit(1);
  }
  const limit = Math.min(parsedLimit, 200);
  const country = getArg("--country", "NP");
  const headed = hasFlag("--headed");
  const noEmail = hasFlag("--no-email");
  const sync = hasFlag("--sync");

  console.log(`📋 Configuration:`);
  console.log(`   Target Query:   "${query}"`);
  console.log(`   Result Limit:   ${limit}`);
  console.log(`   Country Hint:   ${country}`);
  console.log(`   Headless:       ${!headed}`);
  console.log(`   Crawl Emails:   ${!noEmail}`);
  console.log(`   Sync to Orivraa: ${sync ? "YES" : "NO (use --sync to enable)"}`);
  console.log("--------------------------------------------------");

  const leads = await scrapeGoogleMaps({
    query: query!,
    limit,
    headless: !headed,
    crawlEmails: !noEmail,
    countryHint: country,
  });

  if (leads.length === 0) {
    console.log("⚠️ No leads extracted. Check your search query or connection.");
    return;
  }

  exportLeads(leads);

  if (sync) {
    await syncLeadsToOrivraa(leads);
  }

  console.log("\n✨ Done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
