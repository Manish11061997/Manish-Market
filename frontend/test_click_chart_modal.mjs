import { chromium } from '@playwright/test';
import { spawn } from 'child_process';

async function testClickModal() {
  console.log('=== VERIFYING STOCK DETAIL MODAL & CANDLESTICK CHART ===');
  
  const preview = spawn('npx', ['vite', 'preview', '--port', '4195', '--strictPort'], { 
    cwd: '/Users/manish/Documents/antigravity/delightful-davinci/frontend' 
  });

  await new Promise(r => setTimeout(r, 2000));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  page.on('console', msg => {
    if (msg.type() === 'error') console.error('[BROWSER ERROR]:', msg.text());
  });

  console.log('Navigating to http://localhost:4195 ...');
  await page.goto('http://localhost:4195', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Authenticate
  const googleBtn = page.getByRole('button', { name: /Continue with Google/i });
  if (await googleBtn.isVisible()) {
    console.log('Logging in...');
    await googleBtn.click();
    await page.waitForTimeout(1500);
  }

  // Go to Daily Advisory
  console.log('Opening Daily Advisory...');
  const advTab = page.locator('text=Daily Advisory').first();
  await advTab.click();
  await page.waitForTimeout(1000);

  // Click on the card with role="button" and aria-label containing analysis
  const cardButton = page.locator('div[role="button"][aria-label*="View analysis"]').first();
  if (await cardButton.isVisible()) {
    console.log('Found card button, clicking...');
    await cardButton.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: '/Users/manish/.gemini/antigravity/brain/956a376e-6412-41d6-aa84-d308c1ca3dc0/scratch/chart_modal.png' });
    console.log('Stock Detail Modal screenshot captured successfully!');

    // Click "Full Screen"
    const fullScreenBtn = page.getByRole('button', { name: /Full Screen/i });
    if (await fullScreenBtn.isVisible()) {
      console.log('Clicking Full Screen...');
      await fullScreenBtn.click();
      await page.waitForTimeout(1500);

      await page.screenshot({ path: '/Users/manish/.gemini/antigravity/brain/956a376e-6412-41d6-aa84-d308c1ca3dc0/scratch/chart_fullscreen.png' });
      console.log('Full Screen Chart screenshot captured successfully!');
    }
  }

  await browser.close();
  preview.kill();

  console.log('=== TEST COMPLETED ===');
}

testClickModal().catch(e => {
  console.error('Test script error:', e);
  process.exit(1);
});
