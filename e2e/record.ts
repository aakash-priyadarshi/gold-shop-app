/**
 * Stealth recorder - bypasses Cloudflare bot detection.
 * Run: npx ts-node record.ts
 * Then click the "Record" button in the Playwright Inspector that opens.
 */
/**
 * Product demo recorder.
 * Launches Chrome with your real profile cookies, records a video.
 * Run:   npx ts-node record.ts
 * Browse freely, then press Enter in this terminal to stop and save the video.
 */
import { chromium } from "@playwright/test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as readline from "readline";

(async () => {
  // Copy cookies/prefs from real Chrome profile to a temp dir
  const realProfile = path.join(os.homedir(), "AppData", "Local", "Google", "Chrome", "User Data", "Default");
  const tmpUserData = path.join(os.tmpdir(), "pw-demo-userdata");
  const tmpDefault = path.join(tmpUserData, "Default");
  if (!fs.existsSync(tmpDefault)) fs.mkdirSync(tmpDefault, { recursive: true });
  for (const f of ["Cookies", "Local Storage", "Preferences", "Secure Preferences"]) {
    const src = path.join(realProfile, f);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(tmpDefault, f), { recursive: true });
  }

  const videoDir = path.join(__dirname, "demo-recordings");
  if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

  const context = await chromium.launchPersistentContext(tmpUserData, {
    channel: "chrome",
    headless: false,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-infobars",
      "--start-maximized",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
    viewport: null,
    recordVideo: {
      dir: videoDir,
      size: { width: 1920, height: 1080 },
    },
  });

  await context.addInitScript(() => {
    delete (Object.getPrototypeOf(navigator) as any).webdriver;
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });

    // Inject a floating REC badge so you can identify this window
    window.addEventListener("DOMContentLoaded", () => {
      const badge = document.createElement("div");
      badge.textContent = "🔴 REC";
      badge.style.cssText =
        "position:fixed;top:12px;right:12px;z-index:2147483647;" +
        "background:rgba(200,0,0,0.85);color:#fff;font:bold 14px sans-serif;" +
        "padding:6px 12px;border-radius:6px;pointer-events:none;letter-spacing:1px;";
      document.body.appendChild(badge);
    });
  });

  const page = await context.newPage();
  await page.goto("https://www.orivraa.com");

  console.log("\n✅ Browser is open and recording.");
  console.log("   Browse the site freely for your demo.");
  console.log("\n▶  Press ENTER here when you are done to stop and save the video.\n");

  await new Promise<void>((resolve) => {
    const rl = readline.createInterface({ input: process.stdin });
    rl.once("line", () => { rl.close(); resolve(); });
  });

  const videoPath = await page.video()?.path();
  await context.close();

  if (videoPath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dest = path.join(videoDir, `demo-${timestamp}.webm`);
    fs.renameSync(videoPath, dest);
    console.log(`\n🎬 Video saved: ${dest}`);
  }
})();

