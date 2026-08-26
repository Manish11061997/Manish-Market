import { chromium } from '@playwright/test';
import { spawn } from 'child_process';

async function testChartModalDirectly() {
  console.log('=== TESTING STOCK DETAIL MODAL & FULLSCREEN CHART ===');
  
  const preview = spawn('npx', ['vite', 'preview', '--port', '4197', '--strictPort'], { 
    cwd: '/Users/manish/Documents/antigravity/delightful-davinci/frontend' 
  });

  await new Promise(r => setTimeout(r, 2000));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  page.on('console', msg => {
    if (msg.type() === 'error') console.error('[BROWSER ERROR]:', msg.text());
  });

  console.log('1. Navigating to http://localhost:4197 ...');
  await page.goto('http://localhost:4197', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Authenticate
  const googleBtn = page.getByRole('button', { name: /Continue with Google/i });
  if (await googleBtn.isVisible()) {
    console.log('Logging in with 1-click Google Auth...');
    await googleBtn.click();
    await page.waitForTimeout(1500);
  }

  // Go to Daily Advisory or Search
  console.log('2. Opening Advisory to click a stock card...');
  const advTab = page.locator('text=Advisory').first();
  await advTab.click();
  await page.waitForTimeout(1500);

  // Click on the first stock card (e.g. RELIANCE or INFY)
  const stockCard = page.locator('.pro-card-glass').first();
  if (await stockCard.isVisible()) {
    console.log('Clicking on Top Daily Buy stock card...');
    await stockCard.click();
    await page.waitForTimeout(2500);

    await page.screenshot({ path: '/Users/manish/.gemini/antigravity/brain/956a376e-6412-41d6-aa84-d308c1ca3dc0/scratch/chart_modal.png' });
    console.log('Stock Detail Modal screenshot saved!');

    // Click "Full Screen" on chart
    const fullScreenBtn = page.getByRole('button', { name: /Full Screen/i });
    if (await fullScreenBtn.isVisible()) {
      console.log('Clicking "Full Screen" button...');
      await fullScreenBtn.click();
      await page.waitForTimeout(1500);

      await page.screenshot({ path: '/Users/manish/.gemini/antigravity/brain/956a376e-6412-41d6-aa84-d308c1ca3dc0/scratch/chart_fullscreen.png' });
      console.log('Full Screen Chart screenshot saved!');
    }
  }

  await browser.close();
  preview.kill();

  console.log('=== TEST FINISHED ===');
}

testChartModalDirectly().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
