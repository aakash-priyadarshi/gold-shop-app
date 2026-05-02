/**
 * One-time auth setup — run this ONCE to save your Google session.
 *
 *   cd e2e
 *   npx ts-node auth-setup.ts
 *
 * A browser window opens. Log in with Google normally.
 * When you reach the seller dashboard, press Enter in this terminal.
 * Session is saved to e2e/.auth/seller.json and reused by the demo.
 */

import { chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const BASE_URL = process.env.BASE_URL ?? "https://www.orivraa.com";
const AUTH_FILE = path.join(__dirname, ".auth", "seller.json");

async function main() {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log(`\nOpening ${BASE_URL}/login — log in with Google in the browser window.`);
  await page.goto(`${BASE_URL}/login`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise<void>((resolve) =>
    rl.question("\n✅  Once you are on the seller dashboard, press Enter here...\n", () => {
      rl.close();
      resolve();
    })
  );

  await context.storageState({ path: AUTH_FILE });
  console.log(`\nSession saved to ${AUTH_FILE}`);
  console.log("You can now run:  npm run demo\n");

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
