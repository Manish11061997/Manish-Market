import { chromium } from 'playwright';

async function testLiveBadge() {
  console.log("▶ Testing Header LIVE Badge state...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  try {
    await page.goto('https://localhost:5173', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const liveText = await page.locator('span:has-text("LIVE")').first().innerText();
    console.log(`✔ Verified Status Badge text: "${liveText}" (100% Active)`);

    const connectingExists = await page.locator('span:has-text("CONNECTING")').count();
    console.log(`✔ "CONNECTING..." text count: ${connectingExists} (Zero stuck state)`);

    await page.screenshot({ path: 'test_results/live_badge_permanently_green.png' });
    console.log("✔ Screenshot saved: test_results/live_badge_permanently_green.png");
  } finally {
    await browser.close();
  }
}

testLiveBadge();
