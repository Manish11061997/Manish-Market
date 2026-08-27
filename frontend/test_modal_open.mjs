import { chromium } from '@playwright/test';
import { spawn } from 'child_process';

async function testModalOpen() {
  const preview = spawn('npx', ['vite', 'preview', '--port', '4190', '--strictPort'], {
    cwd: '/Users/manish/Documents/antigravity/delightful-davinci/frontend'
  });

  await new Promise(r => setTimeout(r, 2000));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });

  await page.goto('http://localhost:4190', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const googleBtn = page.getByRole('button', { name: /Continue with Google/i });
  if (await googleBtn.isVisible()) {
    await googleBtn.click();
    await page.waitForTimeout(1500);
  }

  const advNav = page.locator('button:has-text("Daily Advisory")').first();
  if (await advNav.isVisible()) {
    await advNav.click();
    await page.waitForTimeout(1500);

    const relCard = page.locator('text=Reliance Industries Ltd').first();
    if (await relCard.isVisible()) {
      await relCard.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/Users/manish/.gemini/antigravity/brain/956a376e-6412-41d6-aa84-d308c1ca3dc0/scratch/chart_with_drawing_tools.png' });
    }
  }

  await browser.close();
  preview.kill();
}

testModalOpen().catch(console.error);
