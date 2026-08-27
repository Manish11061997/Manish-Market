import { chromium } from '@playwright/test';
import { spawn } from 'child_process';

async function testDrawingAndStrategies() {
  console.log('=== TESTING DRAWING TOOLS AND STRATEGY BUILDER ===');

  const preview = spawn('npx', ['vite', 'preview', '--port', '4192', '--strictPort'], {
    cwd: '/Users/manish/Documents/antigravity/delightful-davinci/frontend'
  });

  await new Promise(r => setTimeout(r, 2000));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });

  page.on('console', msg => {
    if (msg.type() === 'error') console.error('[BROWSER ERROR]:', msg.text());
  });

  console.log('Navigating to http://localhost:4192 ...');
  await page.goto('http://localhost:4192', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Authenticate with Google
  const googleBtn = page.getByRole('button', { name: /Continue with Google/i });
  if (await googleBtn.isVisible()) {
    console.log('Authenticating...');
    await googleBtn.click();
    await page.waitForTimeout(1500);
  }

  // 1. Test Strategy Studio
  console.log('1. Navigating to Strategy Backtest Studio...');
  const backtestNav = page.locator('button:has-text("Strategy Backtest")').first();
  if (await backtestNav.isVisible()) {
    await backtestNav.click();
    await page.waitForTimeout(1500);

    // Screenshot Library Tab
    await page.screenshot({ path: '/Users/manish/.gemini/antigravity/brain/956a376e-6412-41d6-aa84-d308c1ca3dc0/scratch/studio_library.png' });

    // Click Create Strategy Tab
    console.log('2. Testing Create Strategy Tab...');
    const builderTab = page.locator('button:has-text("Create Strategy")').first();
    if (await builderTab.isVisible()) {
      await builderTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/Users/manish/.gemini/antigravity/brain/956a376e-6412-41d6-aa84-d308c1ca3dc0/scratch/studio_builder.png' });
    }
  }

  // 3. Test Stock Detail Modal & Drawing Tools
  console.log('3. Testing Stock Detail Modal Drawing Tools...');
  const advisoryNav = page.locator('button:has-text("Daily Advisory")').first();
  if (await advisoryNav.isVisible()) {
    await advisoryNav.click();
    await page.waitForTimeout(1200);

    const inspectBtn = page.locator('button:has-text("Inspect Setup")').first();
    if (await inspectBtn.isVisible()) {
      await inspectBtn.click();
      await page.waitForTimeout(1500);

      // Click Trendline tool
      const trendBtn = page.locator('button[title*="Trend Line"]').first();
      if (await trendBtn.isVisible()) {
        await trendBtn.click();
        await page.waitForTimeout(300);
      }

      await page.screenshot({ path: '/Users/manish/.gemini/antigravity/brain/956a376e-6412-41d6-aa84-d308c1ca3dc0/scratch/chart_drawing_modal.png' });
    }
  }

  await browser.close();
  preview.kill();

  console.log('=== TEST COMPLETED ===');
}

testDrawingAndStrategies().catch(e => {
  console.error('Test script error:', e);
  process.exit(1);
});
