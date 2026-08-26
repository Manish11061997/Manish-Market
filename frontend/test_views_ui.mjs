import { chromium } from '@playwright/test';
import { spawn } from 'child_process';

async function testAllViewsUI() {
  console.log('=== TESTING ALL TAB VIEWS UI WITH PLAYWRIGHT ===');
  
  const preview = spawn('npx', ['vite', 'preview', '--port', '4194', '--strictPort'], { 
    cwd: '/Users/manish/Documents/antigravity/delightful-davinci/frontend' 
  });

  await new Promise(r => setTimeout(r, 2000));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });

  page.on('console', msg => {
    if (msg.type() === 'error') console.error('[BROWSER ERROR]:', msg.text());
  });

  console.log('Navigating to http://localhost:4194 ...');
  await page.goto('http://localhost:4194', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Authenticate
  const googleBtn = page.getByRole('button', { name: /Continue with Google/i });
  if (await googleBtn.isVisible()) {
    console.log('Logging in...');
    await googleBtn.click();
    await page.waitForTimeout(1500);
  }

  // 1. Test Market Assistant (AICopilotChat)
  console.log('1. Testing Market Assistant view...');
  const copilotNav = page.locator('button:has-text("Market Assistant")').first();
  if (await copilotNav.isVisible()) {
    await copilotNav.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/Users/manish/.gemini/antigravity/brain/956a376e-6412-41d6-aa84-d308c1ca3dc0/scratch/ui_market_assistant.png' });
  }

  // 2. Test Strategy Backtest (BacktesterView)
  console.log('2. Testing Strategy Backtest view...');
  const backtestNav = page.locator('button:has-text("Strategy Backtest")').first();
  if (await backtestNav.isVisible()) {
    await backtestNav.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: '/Users/manish/.gemini/antigravity/brain/956a376e-6412-41d6-aa84-d308c1ca3dc0/scratch/ui_strategy_backtest.png' });
  }

  // 3. Test Pattern Engine (AIAnalysisEngineView)
  console.log('3. Testing Pattern Engine view...');
  const patternNav = page.locator('button:has-text("Pattern Engine")').first();
  if (await patternNav.isVisible()) {
    await patternNav.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: '/Users/manish/.gemini/antigravity/brain/956a376e-6412-41d6-aa84-d308c1ca3dc0/scratch/ui_pattern_engine.png' });
  }

  // 4. Test Mobile viewport (375x812) for Market Assistant & Strategy Backtest
  console.log('4. Testing Mobile viewports...');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/Users/manish/.gemini/antigravity/brain/956a376e-6412-41d6-aa84-d308c1ca3dc0/scratch/ui_mobile_pattern.png' });

  if (await copilotNav.isVisible()) {
    await copilotNav.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/Users/manish/.gemini/antigravity/brain/956a376e-6412-41d6-aa84-d308c1ca3dc0/scratch/ui_mobile_copilot.png' });
  }

  await browser.close();
  preview.kill();

  console.log('=== TEST ALL VIEWS COMPLETED ===');
}

testAllViewsUI().catch(e => {
  console.error('Test script error:', e);
  process.exit(1);
});
