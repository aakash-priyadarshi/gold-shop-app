import path from "node:path";
import { EnrichedShopLead, RawMapsPlace, ScraperOptions } from "./types";
import { crawlWebsiteForEmails } from "./email-crawler";

function getPlaywrightChromium() {
  try {
    const e2ePath = path.resolve(__dirname, "../../e2e/node_modules/@playwright/test");
    const { chromium } = require(e2ePath);
    return chromium;
  } catch {
    try {
      const { chromium } = require("@playwright/test");
      return chromium;
    } catch (err: any) {
      throw new Error(
        `Playwright could not be loaded: ${err?.message}`
      );
    }
  }
}

export function parseLocationFromAddress(
  address?: string,
  countryHint?: string
): { city?: string; state?: string; country?: string; postalCode?: string } {
  if (!address) {
    return { country: countryHint || "NP" };
  }

  const parts = address.split(",").map((p) => p.trim());
  let country = countryHint;
  let city: string | undefined;
  let state: string | undefined;
  let postalCode: string | undefined;

  const lower = address.toLowerCase();
  if (lower.includes("nepal") || lower.includes("kathmandu") || lower.includes("pokhara") || lower.includes("lalitpur") || lower.includes("bhaktapur") || lower.includes("butwal") || lower.includes("dharan")) {
    country = "NP";
  } else if (lower.includes("india") || lower.includes("mumbai") || lower.includes("delhi") || lower.includes("jaipur") || lower.includes("chennai") || lower.includes("kolkata") || lower.includes("bangalore") || lower.includes("patna")) {
    country = "IN";
  } else if (lower.includes("united arab emirates") || lower.includes("uae") || lower.includes("dubai") || lower.includes("sharjah") || lower.includes("abu dhabi") || lower.includes("deira")) {
    country = "AE";
  } else if (lower.includes("united states") || lower.includes("usa") || lower.includes("ny 100") || lower.includes("ca 9")) {
    country = "US";
  } else if (lower.includes("united kingdom") || lower.includes("uk") || lower.includes("london") || lower.includes("birmingham")) {
    country = "UK";
  }

  const pinMatch = address.match(/\b\d{4,6}\b/);
  if (pinMatch) {
    postalCode = pinMatch[0];
  }

  if (parts.length >= 2) {
    if (parts.length >= 4) {
      city = parts[parts.length - 3] || parts[parts.length - 2];
      state = parts[parts.length - 2];
    } else if (parts.length === 3) {
      city = parts[1];
    } else {
      city = parts[0];
    }
  }

  return {
    city: city?.replace(/\d+/g, "").trim(),
    state: state?.replace(/\d+/g, "").trim(),
    country: country || countryHint || "NP",
    postalCode,
  };
}

async function launchBrowser(chromium: any, headless: boolean) {
  const commonArgs = [
    "--disable-blink-features=AutomationControlled",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--lang=en-US,en",
  ];

  try {
    return await chromium.launch({
      headless,
      args: commonArgs,
    });
  } catch (defaultErr: any) {
    try {
      console.log("ℹ️ Default Chromium binary not found, falling back to installed Google Chrome...");
      return await chromium.launch({
        channel: "chrome",
        headless,
        args: commonArgs,
      });
    } catch {
      try {
        console.log("ℹ️ Google Chrome not found, falling back to Microsoft Edge...");
        return await chromium.launch({
          channel: "msedge",
          headless,
          args: commonArgs,
        });
      } catch {
        throw new Error(
          `No browser could be launched (${defaultErr?.message}). Please run "pnpm exec playwright install chromium" or install Chrome/Edge.`
        );
      }
    }
  }
}

function normalizeLeadPhone(rawPhone?: string, countryHint: string = "NP"): string | undefined {
  if (!rawPhone) return undefined;
  const cleaned = rawPhone.trim();
  const digits = cleaned.replace(/\D/g, "");
  if (!digits) return cleaned;
  if (cleaned.startsWith("+")) return `+${digits}`;

  // 10 digits national format
  if (digits.length === 10) {
    if (countryHint === "NP" && (digits.startsWith("98") || digits.startsWith("97"))) {
      return `+977${digits}`;
    }
    if (countryHint === "IN" && /^[6-9]/.test(digits)) {
      return `+91${digits}`;
    }
    if (countryHint === "US") {
      return `+1${digits}`;
    }
    if (countryHint === "UK" && digits.startsWith("7")) {
      return `+44${digits}`;
    }
  }
  // UK 11 digits starting with 07
  if (countryHint === "UK" && digits.length === 11 && digits.startsWith("07")) {
    return `+44${digits.slice(1)}`;
  }
  // UAE 9 digits starting with 5
  if (countryHint === "AE" && digits.length === 9 && digits.startsWith("5")) {
    return `+971${digits}`;
  }

  return cleaned;
}

export async function scrapeGoogleMaps(options: ScraperOptions): Promise<EnrichedShopLead[]> {
  const {
    query,
    limit = 20,
    headless = true,
    crawlEmails = true,
    countryHint = "NP",
  } = options;

  const chromium = getPlaywrightChromium();
  console.log(`\n🚀 Launching Google Maps Scraper for: "${query}" (Limit: ${limit})`);

  const browser = await launchBrowser(chromium, headless);

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
  });

  const page = await context.newPage();
  const leads: EnrichedShopLead[] = [];

  try {
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en`;
    console.log(`📍 Navigating to: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    try {
      const consentBtn = page.locator('button:has-text("Accept all"), button:has-text("I agree"), form[action*="consent"] button');
      if (await consentBtn.first().isVisible({ timeout: 4000 })) {
        await consentBtn.first().click();
        await page.waitForTimeout(1500);
      }
    } catch {}

    const feedSelector = 'div[role="feed"]';
    try {
      await page.waitForSelector(feedSelector, { timeout: 12000 });
    } catch {
      console.warn("⚠️ Results feed not immediately found, checking direct place page...");
    }

    console.log("📜 Scrolling through results feed...");
    let previousCount = 0;
    let scrollAttempts = 0;
    const maxScrolls = Math.min(Math.ceil(limit / 5), 15);

    while (scrollAttempts < maxScrolls) {
      const placeLinks = page.locator('a[href*="/maps/place/"]');
      const count = await placeLinks.count();
      if (count >= limit) {
        break;
      }
      if (count === previousCount && scrollAttempts > 3) {
        break;
      }
      previousCount = count;

      await page.evaluate((sel) => {
        const feed = document.querySelector(sel);
        if (feed) {
          feed.scrollTop += 1200;
        } else {
          window.scrollBy(0, 1000);
        }
      }, feedSelector);

      await page.waitForTimeout(1500);
      scrollAttempts++;
    }

    const placeLinks = page.locator('a[href*="/maps/place/"]');
    const totalFound = await placeLinks.count();
    const countToScrape = Math.min(totalFound, limit);
    console.log(`🔍 Found ${totalFound} listings. Scraping top ${countToScrape}...`);

    for (let i = 0; i < countToScrape; i++) {
      try {
        const item = placeLinks.nth(i);
        await item.scrollIntoViewIfNeeded();
        const href = (await item.getAttribute("href")) || "";
        const ariaLabel = (await item.getAttribute("aria-label")) || "";

        await item.click();
        await page.waitForTimeout(1800);

        let shopName = ariaLabel;
        if (!shopName) {
          const h1 = page.locator('h1.fontHeadlineLarge, div[role="main"] h1').first();
          if (await h1.isVisible()) {
            shopName = (await h1.textContent()) || "";
          }
        }
        shopName = shopName.trim();
        if (!shopName) continue;

        let address: string | undefined;
        const addressBtn = page.locator('button[data-item-id="address"]').first();
        if (await addressBtn.isVisible()) {
          address = (await addressBtn.getAttribute("aria-label"))?.replace(/^Address:\s*/i, "").trim();
        }

        let phone: string | undefined;
        const phoneBtn = page.locator('button[data-item-id^="phone:tel:"]').first();
        if (await phoneBtn.isVisible()) {
          const rawPhone = (await phoneBtn.getAttribute("aria-label"))?.replace(/^Phone:\s*/i, "").trim();
          phone = normalizeLeadPhone(rawPhone, countryHint);
        }

        let website: string | undefined;
        const websiteLink = page.locator('a[data-item-id="authority"]').first();
        if (await websiteLink.isVisible()) {
          website = (await websiteLink.getAttribute("href")) || undefined;
        }

        let rating: number | undefined;
        const ratingEl = page.locator('span[aria-label*="stars"]').first();
        if (await ratingEl.isVisible()) {
          const ratingText = await ratingEl.getAttribute("aria-label");
          const rMatch = ratingText?.match(/([\d.]+)\s*stars/i);
          if (rMatch && rMatch[1]) {
            rating = parseFloat(rMatch[1]);
          }
        }

        let reviewCount: number | undefined;
        const reviewsEl = page.locator('span[aria-label*="reviews"]').first();
        if (await reviewsEl.isVisible()) {
          const revText = await reviewsEl.getAttribute("aria-label");
          const revMatch = revText?.match(/([\d,]+)\s*reviews/i);
          if (revMatch && revMatch[1]) {
            reviewCount = parseInt(revMatch[1].replace(/,/g, ""), 10);
          }
        }

        const loc = parseLocationFromAddress(address, countryHint);

        console.log(`  [${i + 1}/${countToScrape}] 🏢 ${shopName}`);
        if (phone) console.log(`      📞 Phone: ${phone}`);
        if (website) console.log(`      🌐 Web: ${website}`);
        if (loc.city) console.log(`      📍 City: ${loc.city}, ${loc.country}`);

        let email: string | undefined;
        let allEmails: string[] = [];
        if (crawlEmails && website) {
          console.log(`      📧 Crawling website for email...`);
          const crawlRes = await crawlWebsiteForEmails(website);
          email = crawlRes.primaryEmail;
          allEmails = crawlRes.allEmails;
          if (email) {
            console.log(`      ✅ Found email: ${email}`);
          } else {
            console.log(`      ⚪ No public email found on site`);
          }
        }

        leads.push({
          shopName,
          address,
          phone,
          website,
          email,
          allEmails,
          city: loc.city,
          state: loc.state,
          country: loc.country,
          postalCode: loc.postalCode,
          rating,
          reviewCount,
          googlePlaceUrl: href ? (href.startsWith("http") ? href : `https://www.google.com${href}`) : undefined,
          source: "GOOGLE_MAPS",
          scrapedAt: new Date().toISOString(),
        });
      } catch (itemErr: any) {
        console.warn(`  ⚠️ Could not parse listing ${i + 1}: ${itemErr?.message}`);
      }
    }
  } catch (err: any) {
    console.error(`❌ Scraping failed: ${err?.message}`);
  } finally {
    await browser.close();
  }

  console.log(`\n🎉 Scraping completed! Gathered ${leads.length} leads.`);
  const withEmails = leads.filter((l) => Boolean(l.email)).length;
  const withPhones = leads.filter((l) => Boolean(l.phone)).length;
  console.log(`   📊 Leads with valid emails: ${withEmails}/${leads.length}`);
  console.log(`   📱 Leads with valid phone numbers (Twilio WhatsApp ready): ${withPhones}/${leads.length}`);
  return leads;
}
