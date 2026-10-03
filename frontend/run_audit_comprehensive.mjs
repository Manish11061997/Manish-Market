import { chromium } from 'playwright';

async function runAudit() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  const warnings = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({ text: msg.text(), location: msg.location() });
    } else if (msg.type() === 'warning') {
      warnings.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    errors.push({ text: 'PAGEERROR: ' + err.message, stack: err.stack });
  });

  page.on('requestfailed', req => {
    networkErrors.push({ url: req.url(), failure: req.failure()?.errorText });
  });

  console.log('1. Navigating to https://manishmarket.web.app...');
  await page.goto('https://manishmarket.web.app', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Check Service Worker
  const sw = await page.evaluate(async () => {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      return regs.map(r => ({ scope: r.scope, active: !!r.active }));
    }
    return [];
  });
  console.log('Service Workers:', JSON.stringify(sw));

  // Test Stock Detail Modal by clicking a stock
  console.log('2. Clicking first stock card (RELIANCE)...');
  try {
    const card = await page.locator('.native-stock-row').first();
    if (await card.count() > 0) {
      await card.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: '/tmp/audit_modal.png' });
      // Close modal
      const closeBtn = page.locator('[aria-label="Close modal"], button.close-modal, .modal-close');
      if (await closeBtn.count() > 0) {
        await closeBtn.first().click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(1000);
    }
  } catch (e) {
    errors.push({ text: 'Modal click error: ' + e.message });
  }

  // Iterate all views
  const views = [
    { name: 'WATCHLIST', selector: 'text=Watchlist Hub' },
    { name: 'DAILY_ADVISORY', selector: 'text=Daily Advisory' },
    { name: 'IPO_HUB', selector: 'text=IPO Intelligence' },
    { name: 'ANALYSIS_ENGINE', selector: 'text=Pattern Engine' },
    { name: 'PAPER_TRADING', selector: 'text=Paper Trading' },
    { name: 'AUDIT_TRAIL', selector: 'text=Audit Trail' },
    { name: 'FNO', selector: 'text=F&O Derivatives' },
    { name: 'SCREENER', selector: 'text=Stock Screener' },
    { name: 'COPILOT', selector: 'text=Market Assistant' },
    { name: 'BACKTEST', selector: 'text=Strategy Backtest' }
  ];

  for (const v of views) {
    console.log('Testing view: ' + v.name);
    try {
      const btn = page.locator(v.selector).first();
      if (await btn.count() > 0) {
        await btn.click();
        await page.waitForTimeout(2500);
        await page.screenshot({ path: '/tmp/audit_' + v.name.toLowerCase() + '.png' });
      } else {
        errors.push({ text: 'Could not find nav button for ' + v.name });
      }
    } catch (e) {
      errors.push({ text: 'Error navigating to ' + v.name + ': ' + e.message });
    }
  }

  // Check US Market Toggle
  console.log('Testing US Market switch...');
  try {
    const usBtn = page.locator('button, div, span').filter({ hasText: 'US NYSE' }).first();
    if (await usBtn.count() > 0) {
      await usBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: '/tmp/audit_us_switched.png' });
    }
  } catch (e) {
    errors.push({ text: 'US Switch error: ' + e.message });
  }

  console.log('--- AUDIT RESULTS ---');
  console.log('Console Errors count:', errors.length);
  console.log('Console Errors detail:\n' + JSON.stringify(errors, null, 2));
  console.log('Network Failures count:', networkErrors.length);
  console.log('Network Failures detail:\n' + JSON.stringify(networkErrors, null, 2));
  console.log('Sample Warnings (first 10):', JSON.stringify(warnings.slice(0, 10), null, 2));

  await browser.close();
  process.exit(0);
}

runAudit().catch(e => {
  console.error('Fatal audit failure:', e);
  process.exit(1);
});
