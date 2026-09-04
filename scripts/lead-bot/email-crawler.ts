import https from "node:https";
import http from "node:http";
import { URL } from "node:url";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const JUNK_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "svg", "webp", "ico",
  "css", "js", "woff", "woff2", "ttf", "eot", "mp4", "mp3"
]);

const JUNK_DOMAINS = new Set([
  "example.com", "domain.com", "yourdomain.com", "yoursite.com",
  "sentry.io", "wixpress.com", "cloudflare.com", "schema.org",
  "w3.org", "google.com", "facebook.com", "instagram.com",
  "twitter.com", "youtube.com", "whatsapp.com"
]);

const PRIORITY_PREFIXES = ["info", "contact", "sales", "support", "hello", "care", "admin", "office"];

function normalizeUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url;
}

async function fetchPageHtml(urlStr: string, timeoutMs = 8000): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(urlStr);
      const isHttps = parsed.protocol === "https:";
      const client = isHttps ? https : http;

      const req = client.get(
        parsed,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
          timeout: timeoutMs,
        },
        (res) => {
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            try {
              const redirectUrl = new URL(res.headers.location, urlStr).toString();
              req.destroy();
              fetchPageHtml(redirectUrl, timeoutMs - 2000).then(resolve);
              return;
            } catch {
              resolve(null);
              return;
            }
          }

          if (!res.statusCode || res.statusCode >= 400) {
            resolve(null);
            return;
          }

          const contentType = res.headers["content-type"] || "";
          if (!contentType.includes("text") && !contentType.includes("html")) {
            resolve(null);
            return;
          }

          let data = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            data += chunk;
            if (data.length > 2_000_000) {
              req.destroy();
              resolve(data);
            }
          });
          res.on("end", () => resolve(data));
        }
      );

      req.on("error", () => resolve(null));
      req.on("timeout", () => {
        req.destroy();
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

export function extractEmailsFromHtml(html: string): string[] {
  if (!html) return [];

  const found = new Set<string>();

  const mailtoMatches = html.matchAll(/href=["']mailto:([^"?#]+)/gi);
  for (const m of mailtoMatches) {
    if (m[1]) {
      const email = m[1].trim().toLowerCase();
      if (isValidEmail(email)) {
        found.add(email);
      }
    }
  }

  const textMatches = html.match(EMAIL_REGEX) || [];
  for (const m of textMatches) {
    const email = m.trim().toLowerCase();
    if (isValidEmail(email)) {
      found.add(email);
    }
  }

  const list = Array.from(found);

  return list.sort((a, b) => {
    const prefixA = a.split("@")[0] || "";
    const prefixB = b.split("@")[0] || "";
    const idxA = PRIORITY_PREFIXES.indexOf(prefixA);
    const idxB = PRIORITY_PREFIXES.indexOf(prefixB);
    const scoreA = idxA !== -1 ? idxA : 99;
    const scoreB = idxB !== -1 ? idxB : 99;
    return scoreA - scoreB;
  });
}

function isValidEmail(email: string): boolean {
  if (!email || email.length < 6 || email.length > 100) return false;
  if (!email.includes("@") || !email.includes(".")) return false;

  const parts = email.split("@");
  if (parts.length !== 2) return false;

  const [local, domain] = parts;
  if (!local || !domain) return false;

  const ext = domain.split(".").pop()?.toLowerCase();
  if (ext && JUNK_EXTENSIONS.has(ext)) return false;

  if (JUNK_DOMAINS.has(domain.toLowerCase())) return false;

  return true;
}

export async function crawlWebsiteForEmails(websiteUrl?: string): Promise<{ primaryEmail?: string; allEmails: string[] }> {
  if (!websiteUrl) {
    return { allEmails: [] };
  }

  const cleanUrl = normalizeUrl(websiteUrl);
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(cleanUrl);
  } catch {
    return { allEmails: [] };
  }

  const origin = parsedUrl.origin;
  const uniqueEmails = new Set<string>();

  const homeHtml = await fetchPageHtml(cleanUrl, 7000);
  if (homeHtml) {
    for (const email of extractEmailsFromHtml(homeHtml)) {
      uniqueEmails.add(email);
    }
  }

  if (uniqueEmails.size === 0) {
    const secondaryPaths = [`${origin}/contact`, `${origin}/contact-us`, `${origin}/about-us`];
    for (const path of secondaryPaths) {
      if (path === cleanUrl) continue;
      const subHtml = await fetchPageHtml(path, 5000);
      if (subHtml) {
        for (const email of extractEmailsFromHtml(subHtml)) {
          uniqueEmails.add(email);
        }
        if (uniqueEmails.size > 0) break;
      }
    }
  }

  const allEmails = Array.from(uniqueEmails);
  return {
    primaryEmail: allEmails[0] || undefined,
    allEmails,
  };
}
