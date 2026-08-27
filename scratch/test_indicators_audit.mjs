import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  console.log("Navigating to https://manishmarket.web.app...");
  await page.goto('https://manishmarket.web.app', { waitUntil: 'networkidle', timeout: 30000 });

  await page.waitForTimeout(2000);

  // Click on first stock row or search input
  const stock = await page.locator('text=RELIANCE').first().or(page.locator('text=TCS').first()).or(page.locator('.stock-row').first());
  if (await stock.count() > 0) {
    await stock.click();
    console.log("Clicked stock card");
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'scratch/chart_with_indicators.png' });
  console.log("Screenshot taken: scratch/chart_with_indicators.png");

  await browser.close();
})();
