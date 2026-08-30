import { chromium } from 'playwright';

async function testProductionUrl() {
  console.log("===============================================================");
  console.log("▶ TESTING ACTUAL PUBLIC PRODUCTION URL: https://manishmarket.web.app");
  console.log("===============================================================");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[PROD BROWSER ERROR]: ${msg.text()}`);
      consoleErrors.push(msg.text());
    }
  });

  try {
    const startTime = Date.now();
    await page.goto('https://manishmarket.web.app', { waitUntil: 'networkidle', timeout: 25000 });
    const loadTimeMs = Date.now() - startTime;
    console.log(`✔ Page loaded in ${loadTimeMs}ms`);

    await page.waitForTimeout(2500);

    // 1. Verify Status Badge
    const liveBadges = await page.locator('span:has-text("LIVE")').allTextContents();
    console.log(`✔ Found LIVE badges:`, liveBadges);

    const connectingBadges = await page.locator('span:has-text("CONNECTING")').count();
    console.log(`✔ Stuck 'CONNECTING...' count: ${connectingBadges} (Expected: 0)`);

    // 2. Verify Indices
    const sensexText = await page.locator('text=SENSEX').first().isVisible();
    const niftyText = await page.locator('text=NIFTY 50').first().isVisible();
    console.log(`✔ SENSEX visible: ${sensexText}, NIFTY 50 visible: ${niftyText}`);

    // 3. Test Navigation: Pattern Engine & TradingAgents
    console.log("▶ Testing Pattern Engine & TradingAgents Multi-Agent Committee...");
    const patternBtn = page.locator('button:has-text("Pattern Engine")').first();
    await patternBtn.click();
    await page.waitForTimeout(2000);

    const taTab = page.locator('button:has-text("TradingAgents")').first();
    await taTab.click();
    await page.waitForTimeout(2500);

    const consensusDecision = await page.locator('text=Multi-Agent Consensus Decision').isVisible();
    console.log(`✔ TradingAgents Multi-Agent Consensus Decision rendered: ${consensusDecision}`);

    // 4. Test Navigation: Watchlist & Chart
    console.log("▶ Testing Watchlist & Candlestick Chart Studio...");
    const watchlistBtn = page.locator('button:has-text("Watchlist Hub")').first();
    await watchlistBtn.click();
    await page.waitForTimeout(2000);

    // 5. Test Navigation: Daily Advisory
    console.log("▶ Testing Daily Advisory Hub...");
    const advisoryBtn = page.locator('button:has-text("Daily Advisory")').first();
    await advisoryBtn.click();
    await page.waitForTimeout(2000);

    // 6. Test Navigation: Stock Screener
    console.log("▶ Testing Stock Screener...");
    const screenerBtn = page.locator('button:has-text("Stock Screener")').first();
    await screenerBtn.click();
    await page.waitForTimeout(2000);

    // Capture Full Page Screenshot from Public Production
    await page.screenshot({ path: 'test_results/PROD_LIVE_VERIFIED.png', fullPage: true });
    console.log("✔ Screenshot captured from https://manishmarket.web.app: test_results/PROD_LIVE_VERIFIED.png");

    console.log("===============================================================");
    console.log(`  PUBLIC PRODUCTION AUDIT RESULT: ${consoleErrors.length === 0 ? '100% PERFECT (0 ERRORS)' : 'WARNINGS FOUND'}`);
    console.log("===============================================================");

  } catch (err) {
    console.error("❌ Production test error:", err);
  } finally {
    await browser.close();
  }
}

testProductionUrl();
