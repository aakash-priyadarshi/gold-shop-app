import fs from "node:fs";
import path from "node:path";
import { EnrichedShopLead } from "./types";

function escapeCsv(val?: string | number | null): string {
  if (val === undefined || val === null) return '""';
  let str = String(val);
  // Mitigate CSV Formula Injection (DDE)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

export function exportLeads(leads: EnrichedShopLead[], outputDir?: string): { csvPath: string; jsonPath: string } {
  const dir = outputDir || path.resolve(__dirname, "output");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(dir, `leads-${timestamp}.json`);
  const csvPath = path.join(dir, `leads-${timestamp}.csv`);

  fs.writeFileSync(jsonPath, JSON.stringify(leads, null, 2), "utf8");

  const headers = [
    "Shop Name",
    "Email",
    "Phone",
    "Website",
    "City",
    "State",
    "Country",
    "Address",
    "Rating",
    "Review Count",
    "Source",
    "Google Place URL",
    "Scraped At",
  ];

  const rows = leads.map((l) => [
    escapeCsv(l.shopName),
    escapeCsv(l.email),
    escapeCsv(l.phone),
    escapeCsv(l.website),
    escapeCsv(l.city),
    escapeCsv(l.state),
    escapeCsv(l.country),
    escapeCsv(l.address),
    escapeCsv(l.rating),
    escapeCsv(l.reviewCount),
    escapeCsv(l.source),
    escapeCsv(l.googlePlaceUrl),
    escapeCsv(l.scrapedAt),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  fs.writeFileSync(csvPath, csvContent, "utf8");

  console.log(`\n💾 Saved files:`);
  console.log(`   📄 CSV:  ${csvPath}`);
  console.log(`   📋 JSON: ${jsonPath}`);

  return { csvPath, jsonPath };
}
