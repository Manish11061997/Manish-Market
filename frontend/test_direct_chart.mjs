import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:5173...");
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1000);

  // Set the localStorage values directly in the page context
  await page.evaluate(() => {
    localStorage.setItem('manish_market_current_user', JSON.stringify({
      id: 'usr_manish',
      name: 'Manish Rahul',
      email: 'manish@example.com',
      marketPreference: 'IN',
      balanceIn: 1000000.0,
      balanceUs: 100000.0,
      createdAt: new Date().toISOString(),
      isGoogleAuth: true
    }));
    localStorage.setItem('manish_market_auth_token', 'token_valid_123');
    window.location.reload();
  });

  await page.waitForTimeout(3000);

  // Take screenshot of terminal dashboard
  await page.screenshot({ path: '../scratch/authenticated_terminal.png' });
  console.log("Saved ../scratch/authenticated_terminal.png");

  // Click on the first stock card / recommendation
  const stock = page.locator('[role="button"]:has-text("RELIANCE"), .pro-card-glass:has-text("RELIANCE"), text=RELIANCE.NS').first();
  if (await stock.count() > 0) {
    await stock.click();
    console.log("Clicked stock card");
  } else {
    const anyCard = page.locator('.pro-card-glass').first();
    if (await anyCard.count() > 0) {
      await anyCard.click();
      console.log("Clicked any card");
    }
  }

  await page.waitForTimeout(4000);
  await page.screenshot({ path: '../scratch/stock_modal_chart_indicators.png' });
  console.log("Saved ../scratch/stock_modal_chart_indicators.png");

  await browser.close();
})();
