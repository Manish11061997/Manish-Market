import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = process.env.TEST_URL || 'https://manishmarket.web.app';
console.log(`\n======================================================`);
console.log(`🚀 LAUNCHING MERCILLESS FULL-APPLICATION AUDIT`);
console.log(`Target URL: ${BASE_URL}`);
console.log(`======================================================\n`);

const issues = [];

function recordIssue(severity, category, title, details) {
  const issue = { severity, category, title, details, timestamp: new Date().toISOString() };
  issues.push(issue);
  console.log(`[${severity.toUpperCase()}] [${category}] ${title} - ${details}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  // Monitor all console logs and network errors
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      // Filter non-fatal browser network noise if needed
      recordIssue('High', 'Console Error', 'Client-side Exception', text);
    } else if (type === 'warning' && (text.includes('deprecated') || text.includes('Each child in a list') || text.includes('Failed prop type') || text.includes('Can\'t perform a React state update'))) {
      recordIssue('Medium', 'React Warning', 'Lifecycle / Key Warning', text);
    }
  });

  page.on('pageerror', err => {
    recordIssue('Critical', 'Uncaught Exception', err.message, err.stack);
  });

  page.on('requestfailed', req => {
    const url = req.url();
    const errText = req.failure()?.errorText || 'Unknown';
    // Ignore intentional/expected browser navigation abortions when components unmount
    if (errText === 'net::ERR_ABORTED') {
      return;
    }
    // Ignore analytics/ad blocking failures if any
    if (!url.includes('google-analytics') && !url.includes('doubleclick')) {
      recordIssue('Medium', 'Network Failure', `Failed HTTP request: ${req.method()} ${url}`, errText);
    }
  });

  try {
    console.log('--- PHASE 1: Initial Load & Guest Auth ---');
    const loadStart = Date.now();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const domLoadedTime = Date.now() - loadStart;
    console.log(`DOM Loaded in ${domLoadedTime}ms`);

    await page.waitForTimeout(2500);

    const guestBtn = page.locator('text=Explore Terminal as Guest').first();
    if (await guestBtn.isVisible()) {
      await guestBtn.click({ force: true });
      await page.waitForTimeout(2000);
      console.log('✓ Guest mode activated');
    } else {
      console.log('i Already on main terminal');
    }

    console.log('\n--- PHASE 2: Navigation & Hubs Audit ---');
    const tabs = [
      { name: 'Watchlist / Terminal', selector: '[data-nav-id="WATCHLIST"]', testAction: async () => {
        await page.waitForTimeout(1500);
        // If empty, click quick-pick or check recommendations
        let count = await page.locator('.stock-card, [data-testid="stock-card"]').count();
        if (count === 0) {
          const quickPick = page.locator('button:has-text("RELIANCE"), button:has-text("NVDA")').first();
          if (await quickPick.isVisible()) {
            await quickPick.click({ force: true });
            await page.waitForTimeout(1000);
            count = await page.locator('.stock-card, [data-testid="stock-card"]').count();
          }
        }
        console.log(`  Watchlist cards count: ${count}`);
        if (count === 0) recordIssue('High', 'Watchlist', 'No stocks rendered in default watchlist', 'Watchlist container is empty on landing');
      }},
      { name: 'F&O Trading Hub', selector: '[data-nav-id="FNO"]', testAction: async () => {
        await page.waitForTimeout(1500);
        const chainTab = page.locator('button:has-text("Live Option Chain Matrix")').first();
        if (await chainTab.isVisible()) {
          await chainTab.click({ force: true });
          await page.waitForTimeout(1500);
        }
        const strikes = await page.locator('table tr, .strike-row').count();
        console.log(`  F&O Option chain rows: ${strikes}`);
        if (strikes === 0) recordIssue('Medium', 'FNO Hub', 'Option chain table empty', 'No strikes rendered in FNO view');
      }},
      { name: 'Paper Trading Hub', selector: '[data-nav-id="PAPER_TRADING"]', testAction: async () => {
        await page.waitForTimeout(1500);
        const balance = await page.locator('text=/₹\\s*[\\d,]+|\\$\\s*[\\d,]+/').first();
        if (await balance.count() === 0) recordIssue('Medium', 'Paper Trading', 'Portfolio balance not visible', 'No currency balance found');
      }},
      { name: 'Stock Screener', selector: '[data-nav-id="SCREENER"]', testAction: async () => {
        await page.waitForTimeout(1500);
        const rows = await page.locator('tbody tr, .screener-row').count();
        console.log(`  Screener rows: ${rows}`);
        if (rows === 0) recordIssue('Medium', 'Screener', 'Screener table empty', 'No matching screener stocks found');
      }},
      { name: 'Backtester', selector: '[data-nav-id="BACKTEST"]', testAction: async () => {
        await page.waitForTimeout(1500);
        const runBtn = page.locator('button:has-text("Run Simulation"), button:has-text("Run Backtest"), button:has-text("Execute")').first();
        if (await runBtn.count() > 0 && await runBtn.isVisible()) {
          await runBtn.click({ force: true });
          await page.waitForTimeout(2000);
          console.log('  Backtest run executed');
        } else {
          recordIssue('Low', 'Backtester', 'Run button not found or disabled', 'Unable to trigger backtest run');
        }
      }},
      { name: 'IPO Hub', selector: '[data-nav-id="IPO_HUB"]', testAction: async () => {
        await page.waitForTimeout(1500);
      }},
      { name: 'AI Analysis Engine', selector: '[data-nav-id="ANALYSIS_ENGINE"]', testAction: async () => {
        await page.waitForTimeout(1500);
      }},
      { name: 'Daily Advisory Hub', selector: '[data-nav-id="DAILY_ADVISORY"]', testAction: async () => {
        await page.waitForTimeout(1500);
      }}
    ];

    for (const t of tabs) {
      console.log(`Testing view: ${t.name}...`);
      const navItem = page.locator(t.selector).first();
      if (await navItem.count() > 0 && await navItem.isVisible()) {
        await navItem.click({ force: true });
        await t.testAction();
      } else {
        console.log(`  ⚠ Nav item for ${t.name} not found with selector: ${t.selector}`);
      }
    }

    console.log('\n--- PHASE 3: Modals & Panels Audit ---');
    // Return to main watchlist
    const mainNav = page.locator('[data-nav-id="WATCHLIST"]').first();
    if (await mainNav.count() > 0) await mainNav.click({ force: true });
    await page.waitForTimeout(1500);

    // 1. Stock Detail Modal
    console.log('Testing Stock Detail Modal (TATAPOWER)...');
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('TATAPOWER');
      await page.waitForTimeout(1000);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2500);

      // Check modal components
      const modal = page.locator('.modal, [role="dialog"], .stock-detail-container, div:has-text("TATAPOWER")').first();
      if (await modal.count() === 0) {
        recordIssue('High', 'Modal', 'Stock modal failed to open on Enter', 'TATAPOWER modal did not render');
      } else {
        console.log('  ✓ Stock modal opened');
        // Test tabs inside modal
        const tabsInModal = ['Chart', 'Trade Setup', 'Fundamentals', 'Level 2 & Actions'];
        for (const mt of tabsInModal) {
          const mTabBtn = page.locator(`button:has-text("${mt}")`).first();
          if (await mTabBtn.count() > 0) {
            await mTabBtn.click({ force: true });
            await page.waitForTimeout(800);
            console.log(`  ✓ Sub-tab ${mt} clicked`);
          } else {
            recordIssue('Low', 'Modal Subtabs', `Modal tab "${mt}" missing`, `Tab button for ${mt} not found`);
          }
        }

        // Close modal
        const closeBtn = page.locator('button:has-text("✕"), [aria-label="Close"], button:has(.lucide-x)').first();
        if (await closeBtn.count() > 0) {
          await closeBtn.click({ force: true });
          await page.waitForTimeout(1000);
        }
      }
    }

    // 2. Broker Settings Modal
    console.log('Testing Broker Settings Modal...');
    const brokerBtn = page.locator('button[title*="Broker"], button:has-text("Broker"), button:has-text("API Keys")').first();
    if (await brokerBtn.count() > 0 && await brokerBtn.isVisible()) {
      await brokerBtn.click({ force: true });
      await page.waitForTimeout(1500);
      const closeB = page.locator('button:has-text("✕"), button:has-text("Cancel"), button:has-text("Close")').first();
      if (await closeB.count() > 0) await closeB.click({ force: true });
      console.log('  ✓ Broker settings modal tested');
    }

    // 3. Price Alerts Modal
    console.log('Testing Price Alerts Modal...');
    const alertBtn = page.locator('button[title*="Alert"], button:has-text("Alerts")').first();
    if (await alertBtn.count() > 0 && await alertBtn.isVisible()) {
      await alertBtn.click({ force: true });
      await page.waitForTimeout(1500);
      const closeA = page.locator('button:has-text("✕"), button:has-text("Close")').first();
      if (await closeA.count() > 0) await closeA.click({ force: true });
      console.log('  ✓ Price alerts modal tested');
    }

    // 4. Debug Panel & Health Panel
    console.log('Testing Live Data Panels...');
    const debugBtn = page.locator('button[title*="Debug"], button:has-text("Debug"), button:has-text("Telemetry")').first();
    if (await debugBtn.count() > 0 && await debugBtn.isVisible()) {
      await debugBtn.click({ force: true });
      await page.waitForTimeout(1000);
      console.log('  ✓ Debug panel toggled');
    }

    console.log('\n--- PHASE 4: Responsive / Mobile Viewport Audit (390x844) ---');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1500);

    // Check horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    if (hasHorizontalScroll) {
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      recordIssue('Medium', 'Mobile Responsiveness', 'Horizontal Overflow Detected', `Document scrollWidth (${scrollWidth}px) exceeds window innerWidth (390px)`);
    } else {
      console.log('  ✓ Mobile viewport has zero horizontal overflow');
    }

    // Mobile navigation bar check
    const mobileNav = page.locator('.mobile-nav, nav, footer, .bottom-nav').first();
    if (await mobileNav.count() > 0 && await mobileNav.isVisible()) {
      console.log('  ✓ Mobile bottom navigation is visible');
    }

    // Capture mobile audit screenshot
    await page.screenshot({ path: 'scratch/audit_mobile_viewport.png' });

    console.log('\n--- PHASE 5: Market Data & Tick Stream Audit ---');
    await page.setViewportSize({ width: 1440, height: 950 });
    await page.waitForTimeout(2000);

    // Track price changes over 10 seconds to confirm live price movement
    const initialPrices = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('.stock-card, [data-testid="stock-card"]'));
      return els.slice(0, 10).map(el => {
        const sym = el.querySelector('.symbol, h3, h4, span')?.innerText || '';
        const price = el.querySelector('.price, .mono-num')?.innerText || '';
        return { sym, price };
      });
    });

    console.log(`Tracking ${initialPrices.length} stocks for 8 seconds for live tick updates...`);
    await page.waitForTimeout(8000);

    const updatedPrices = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('.stock-card, [data-testid="stock-card"]'));
      return els.slice(0, 10).map(el => {
        const sym = el.querySelector('.symbol, h3, h4, span')?.innerText || '';
        const price = el.querySelector('.price, .mono-num')?.innerText || '';
        return { sym, price };
      });
    });

    let ticksObserved = 0;
    for (let i = 0; i < Math.min(initialPrices.length, updatedPrices.length); i++) {
      if (initialPrices[i].price !== updatedPrices[i].price) {
        ticksObserved++;
      }
    }
    console.log(`Live ticks observed across watchlist cards: ${ticksObserved}`);

  } catch (err) {
    recordIssue('Critical', 'Audit Runner Error', err.message, err.stack);
  } finally {
    await browser.close();
  }

  console.log(`\n======================================================`);
  console.log(`AUDIT COMPLETE. Total Issues Found: ${issues.length}`);
  console.log(`======================================================\n`);

  fs.writeFileSync('scratch/e2e_audit_results.json', JSON.stringify(issues, null, 2));
})();
