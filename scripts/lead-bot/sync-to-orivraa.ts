import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import { EnrichedShopLead, IngestLeadPayload } from "./types";

export async function syncLeadsToOrivraa(
  leads: EnrichedShopLead[],
  options?: {
    apiUrl?: string;
    adminToken?: string;
  }
): Promise<{ success: boolean; imported: number; updated: number; skipped: number; message?: string }> {
  const apiUrl =
    options?.apiUrl ||
    process.env.ORIVRAA_API_URL ||
    "http://localhost:4000/api";
  const token = options?.adminToken || process.env.ORIVRAA_ADMIN_TOKEN || "";

  const endpoint = `${apiUrl.replace(/\/$/, "")}/leads/import`;
  console.log(`\n🔄 Syncing ${leads.length} leads to Orivraa API: ${endpoint}`);

  const payload: IngestLeadPayload[] = leads.map((l) => ({
    shopName: l.shopName,
    email: l.email,
    phone: l.phone,
    website: l.website,
    address: l.address,
    city: l.city,
    state: l.state,
    country: l.country,
    rating: l.rating,
    reviewCount: l.reviewCount,
    source: "GOOGLE_MAPS",
    metadata: {
      allEmails: l.allEmails,
      googlePlaceUrl: l.googlePlaceUrl,
      postalCode: l.postalCode,
    },
  }));

  const postData = JSON.stringify({ leads: payload });
  const parsedUrl = new URL(endpoint);

  const isLocal =
    parsedUrl.hostname === "localhost" ||
    parsedUrl.hostname === "127.0.0.1" ||
    parsedUrl.hostname.endsWith(".local");

  if (!isLocal && parsedUrl.protocol !== "https:") {
    console.error(`❌ Security Error: Remote sync endpoint must use HTTPS (${endpoint})`);
    return {
      success: false,
      imported: 0,
      updated: 0,
      skipped: leads.length,
      message: "Remote sync endpoint must use HTTPS to prevent cleartext exposure.",
    };
  }

  const client = parsedUrl.protocol === "https:" ? https : http;

  return new Promise((resolve) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData).toString(),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const req = client.request(
      parsedUrl,
      {
        method: "POST",
        headers,
        timeout: 15000,
      },
      (res) => {
        let resData = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (resData += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(resData);
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              console.log(`✅ Successfully synced leads to Orivraa!`);
              console.log(`   Imported: ${parsed.imported ?? leads.length}`);
              console.log(`   Updated:  ${parsed.updated ?? 0}`);
              console.log(`   Skipped:  ${parsed.skipped ?? 0}`);
              resolve({
                success: true,
                imported: parsed.imported ?? leads.length,
                updated: parsed.updated ?? 0,
                skipped: parsed.skipped ?? 0,
              });
            } else {
              console.error(`❌ Sync rejected (${res.statusCode}): ${parsed.message || resData}`);
              resolve({
                success: false,
                imported: 0,
                updated: 0,
                skipped: leads.length,
                message: parsed.message || `HTTP ${res.statusCode}`,
              });
            }
          } catch {
            resolve({
              success: false,
              imported: 0,
              updated: 0,
              skipped: leads.length,
              message: `Invalid server response: ${resData.slice(0, 100)}`,
            });
          }
        });
      }
    );

    req.on("error", (err) => {
      console.error(`❌ Network error while syncing to Orivraa: ${err.message}`);
      resolve({
        success: false,
        imported: 0,
        updated: 0,
        skipped: leads.length,
        message: err.message,
      });
    });

    req.write(postData);
    req.end();
  });
}
