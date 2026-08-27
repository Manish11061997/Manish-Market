import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:5173...");
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(2000);

  // Click Guest Login
  const guestBtn = page.locator('text=Explore Terminal as Guest').first();
  if (await guestBtn.count() > 0 && await guestBtn.isVisible()) {
    await guestBtn.click({ force: true });
    await page.waitForTimeout(2500);
  }

  // Click on NYKAA card
  const nykaaCard = page.locator('text=NYKAA').first();
  await nykaaCard.click({ force: true });
  console.log("Clicked NYKAA stock card!");

  await page.waitForTimeout(4000);
  await page.screenshot({ path: '../scratch/nykaa_chart_with_indicators.png' });
  console.log("Saved ../scratch/nykaa_chart_with_indicators.png");

  // Open Indicators Modal
  const indBtn = page.locator('button:has-text("Indicators")').first();
  if (await indBtn.count() > 0) {
    await indBtn.click({ force: true });
    console.log("Opened Indicators Modal!");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '../scratch/indicators_modal_open.png' });
    console.log("Saved ../scratch/indicators_modal_open.png");

    // Click "Full Momentum" bundle (EMA 20 + RSI + MACD)
    const bundleBtn = page.locator('button:has-text("Full Momentum")').first();
    if (await bundleBtn.count() > 0) {
      await bundleBtn.click({ force: true });
      console.log("Selected Full Momentum");
    }

    const applyBtn = page.locator('button:has-text("Apply Indicators")').first();
    if (await applyBtn.count() > 0) {
      await applyBtn.click({ force: true });
      console.log("Applied Indicators!");
    }
  }

  await page.waitForTimeout(3500);
  await page.screenshot({ path: '../scratch/nykaa_chart_rsi_macd_active.png' });
  console.log("Saved ../scratch/nykaa_chart_rsi_macd_active.png");

  await browser.close();
})();
