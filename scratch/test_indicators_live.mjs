import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();

  // Set mock user so full app is active
  await page.addInitScript(() => {
    localStorage.setItem('mm_user', JSON.stringify({
      uid: 'user_123',
      email: 'pro_trader@market.io',
      displayName: 'Pro Trader'
    }));
  });

  console.log("Opening dev server on port 5173...");
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(3000);

  // Click on a stock card to open the detail modal with chart
  const card = await page.locator('text=RELIANCE').first().or(page.locator('text=TCS').first()).or(page.locator('.stock-row').first());
  if (await card.count() > 0) {
    await card.click();
    console.log("Clicked stock card");
  }

  await page.waitForTimeout(3500);
  await page.screenshot({ path: '../scratch/indicators_default_chart.png' });
  console.log("Saved ../scratch/indicators_default_chart.png");

  // Click the Indicators button
  const indBtn = await page.locator('button:has-text("Indicators")').first();
  if (await indBtn.count() > 0) {
    await indBtn.click();
    console.log("Clicked Indicators button");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '../scratch/indicators_modal_open.png' });
    console.log("Saved ../scratch/indicators_modal_open.png");

    // Click "Full Momentum" bundle button
    const bundleBtn = await page.locator('button:has-text("Full Momentum")').first();
    if (await bundleBtn.count() > 0) {
      await bundleBtn.click();
      console.log("Clicked Full Momentum bundle");
    }

    // Click Apply Indicators button
    const applyBtn = await page.locator('button:has-text("Apply Indicators")').first();
    if (await applyBtn.count() > 0) {
      await applyBtn.click();
      console.log("Clicked Apply Indicators");
    }
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: '../scratch/indicators_active_chart.png' });
  console.log("Saved ../scratch/indicators_active_chart.png");

  await browser.close();
})();
