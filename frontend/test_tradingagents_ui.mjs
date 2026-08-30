import { chromium } from 'playwright';

async function testTradingAgents() {
  console.log("▶ Launching browser to test TradingAgents Multi-Agent UI...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[BROWSER ERROR]: ${msg.text()}`);
  });

  try {
    await page.goto('https://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Navigate to Equity Signals / Pattern Engine
    console.log("▶ Navigating to Pattern Engine (AI Analysis Engine)...");
    const patternBtn = page.locator('button:has-text("Pattern Engine")').first();
    if (await patternBtn.isVisible()) {
      await patternBtn.click();
      await page.waitForTimeout(2000);
    }

    // Click TradingAgents Tab
    console.log("▶ Clicking TradingAgents Horizon Tab...");
    const taTab = page.locator('button:has-text("TradingAgents")').first();
    if (await taTab.isVisible()) {
      await taTab.click();
      await page.waitForTimeout(3000);
      console.log("✔ TradingAgents Tab clicked successfully.");
    } else {
      console.error("❌ TradingAgents Tab button not found.");
    }

    // Capture Screenshot
    await page.screenshot({ path: 'test_results/tradingagents_committee_verified.png', fullPage: true });
    console.log("✔ Captured screenshot: test_results/tradingagents_committee_verified.png");

  } catch (err) {
    console.error("❌ Test failed:", err);
  } finally {
    await browser.close();
  }
}

testTradingAgents();
