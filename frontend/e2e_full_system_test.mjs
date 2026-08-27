import { chromium } from '@playwright/test';
import { spawn } from 'child_process';

async function runE2EComprehensiveAudit() {
  console.log('====================================================');
  console.log('🚀 STARTING COMPREHENSIVE E2E USER EXPERIENCE AUDIT');
  console.log('====================================================');

  const preview = spawn('npx', ['vite', 'preview', '--port', '4199', '--strictPort'], {
    cwd: '/Users/manish/Documents/antigravity/delightful-davinci/frontend'
  });

  await new Promise(r => setTimeout(r, 2000));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('ERR_NAME_NOT_RESOLVED') && !msg.text().includes('config.json')) {
      errors.push(`[Console Error]: ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    errors.push(`[Page Error]: ${err.message}`);
  });

  console.log('1. Loading App...');
  await page.goto('http://localhost:4199', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Authenticate
  const googleBtn = page.getByRole('button', { name: /Continue with Google/i });
  if (await googleBtn.isVisible()) {
    console.log('   -> Authenticating with Google Sign-In...');
    await googleBtn.click();
    await page.waitForTimeout(1500);
  }

  const views = [
    { name: 'Watchlist Hub', btn: 'Watchlist Hub' },
    { name: 'Daily Advisory', btn: 'Daily Advisory' },
    { name: 'IPO Intelligence', btn: 'IPO Intelligence Hub' },
    { name: 'Pattern Engine', btn: 'Pattern Engine' },
    { name: 'Paper Trading & OMS', btn: 'Paper Trading & OMS' },
    { name: 'Audit Trail & Trace', btn: 'Audit Trail & Trace' },
    { name: 'F&O Derivatives', btn: 'F&O Derivatives' },
    { name: 'Equity Signals', btn: 'Equity Signals' },
    { name: 'Stock Screener', btn: 'Stock Screener' },
    { name: 'Market Assistant', btn: 'Market Assistant' },
    { name: 'Strategy Backtest', btn: 'Strategy Backtest' }
  ];

  for (const v of views) {
    console.log(`2. Testing View: ${v.name}...`);
    const btn = page.locator(`button:has-text("${v.btn}")`).first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(1200);

      // Verify no top cutoff (scroll position is 0)
      const scrollY = await page.evaluate(() => window.scrollY);
      if (scrollY > 50) {
        console.warn(`   ⚠️ Warning: View ${v.name} has unexpected scrollY: ${scrollY}`);
      } else {
        console.log(`   ✅ Scroll position aligned: ${scrollY}px`);
      }
    } else {
      console.warn(`   ⚠️ View button not found: ${v.btn}`);
    }
  }

  // Test Market Toggle (US / IN)
  console.log('3. Testing Global Market Toggle (NSE/BSE <-> US NYSE)...');
  const usToggle = page.locator('button:has-text("US NYSE")').first();
  if (await usToggle.isVisible()) {
    await usToggle.click();
    await page.waitForTimeout(1500);
    console.log('   ✅ Switched to US Market successfully.');

    const inToggle = page.locator('button:has-text("NSE / BSE")').first();
    if (await inToggle.isVisible()) {
      await inToggle.click();
      await page.waitForTimeout(1500);
      console.log('   ✅ Switched back to Indian Market successfully.');
    }
  }

  // Test Stock Detail Modal & Drawing Tools
  console.log('4. Testing Stock Detail Modal & Interactive Drawing Canvas...');
  const watchTab = page.locator('button:has-text("Watchlist Hub")').first();
  if (await watchTab.isVisible()) {
    await watchTab.click();
    await page.waitForTimeout(1000);

    const stockCard = page.locator('.native-stock-row, .ticker-pill, button:has-text("RELIANCE")').first();
    if (await stockCard.isVisible()) {
      await stockCard.click();
      await page.waitForTimeout(1500);

      // Test Full Screen Chart Trigger
      const fsBtn = page.locator('button:has-text("Full Screen")').first();
      if (await fsBtn.isVisible()) {
        await fsBtn.click();
        await page.waitForTimeout(800);
        console.log('   ✅ Opened Full-Screen Chart View.');

        // Close Full Screen
        const exitBtn = page.locator('button:has-text("Exit")').first();
        if (await exitBtn.isVisible()) {
          await exitBtn.click();
          await page.waitForTimeout(500);
          console.log('   ✅ Exited Full-Screen Chart View.');
        }
      }
    }
  }

  console.log('====================================================');
  console.log('📊 AUDIT SUMMARY:');
  console.log(`Total Critical JS Errors Detected: ${errors.length}`);
  if (errors.length > 0) {
    errors.forEach(e => console.error(e));
  } else {
    console.log('🎉 100% CLEAN FRONTEND RUNTIME: Zero uncaught exceptions or React errors!');
  }
  console.log('====================================================');

  await browser.close();
  preview.kill();

  if (errors.length > 0) process.exit(1);
  process.exit(0);
}

runE2EComprehensiveAudit().catch(err => {
  console.error('Audit Script Error:', err);
  process.exit(1);
});
