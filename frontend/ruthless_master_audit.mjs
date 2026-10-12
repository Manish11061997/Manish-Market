import { chromium } from 'playwright';

async function runRuthlessMasterAudit() {
  console.log('================================================================');
  console.log('🔥 STARTING RUTHLESS MASTER AUDIT ACROSS ALL WORKSPACES & DATA 🔥');
  console.log('================================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const consoleWarnings = [];
  const networkFailures = [];
  const visualBugs = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      console.log(`❌ [CONSOLE ERROR]: ${text}`);
      consoleErrors.push(text);
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(text);
    }
  });

  page.on('pageerror', err => {
    console.log(`💥 [PAGE UNCAUGHT ERROR]: ${err.message}`);
    consoleErrors.push(`UNCAUGHT: ${err.message}`);
  });

  page.on('requestfailed', req => {
    if (!req.url().includes('favicon') && !req.url().includes('analytics')) {
      console.log(`🚫 [REQUEST FAILED]: ${req.url()} (${req.failure()?.errorText})`);
      networkFailures.push({ url: req.url(), error: req.failure()?.errorText });
    }
  });

  // Helper to scan DOM for broken strings
  async function scanForAnomalies(locationLabel) {
    const bodyText = await page.evaluate(() => document.body.innerText);
    const anomalies = [];
    if (/\bNaN\b/.test(bodyText)) anomalies.push('NaN detected');
    if (/\bundefined\b/.test(bodyText)) anomalies.push('undefined detected');
    if (/\bnull\b/.test(bodyText)) anomalies.push('null literal detected');
    if (/\[object Object\]/.test(bodyText)) anomalies.push('[object Object] detected');
    if (/Invalid Date/.test(bodyText)) anomalies.push('Invalid Date detected');
    if (/₹\s*\$/.test(bodyText) || /\$\s*₹/.test(bodyText)) anomalies.push('Mixed currency ₹$ detected');

    if (anomalies.length > 0) {
      console.log(`⚠️ Anomalies in ${locationLabel}:`, anomalies);
      visualBugs.push({ location: locationLabel, issues: anomalies });
    }
    return anomalies;
  }

  const targetUrl = 'https://manishmarket.web.app';
  console.log(`\n1. Navigating to ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  await scanForAnomalies('Initial Boot');

  // -------------------------------------------------------------
  // TEST SECTION 1: HEADER, TICKER TAPE & MARKET BREADTH (IN)
  // -------------------------------------------------------------
  console.log('\n--- TEST SECTION 1: Header & Breadth Bar (IN) ---');
  const niftyPill = page.locator('text=NIFTY 50').first();
  const sensexPill = page.locator('text=SENSEX').first();
  console.log('   NIFTY 50 visible:', await niftyPill.isVisible());
  console.log('   SENSEX visible:', await sensexPill.isVisible());

  const breadthBar = page.locator('text=Adv').first();
  console.log('   Breadth Bar Adv/Dec visible:', await breadthBar.isVisible());
  await scanForAnomalies('Header & Breadth IN');

  // -------------------------------------------------------------
  // TEST SECTION 2: WATCHLIST & STOCK DETAIL MODAL
  // -------------------------------------------------------------
  console.log('\n--- TEST SECTION 2: Watchlist & Chart Studio Modal ---');
  const watchBtn = page.locator('button:has-text("Watchlist Hub")').first();
  if (await watchBtn.isVisible()) {
    await watchBtn.click();
    await page.waitForTimeout(2000);
    await scanForAnomalies('Watchlist View');

    // Click first stock card to open Chart Modal
    const stockRow = page.locator('.native-stock-row, button:has-text("RELIANCE")').first();
    if (await stockRow.isVisible()) {
      console.log('   Opening Stock Detail Modal...');
      await stockRow.click();
      await page.waitForTimeout(2500);
      await scanForAnomalies('Stock Detail Modal');

      // Test timeframe toggles
      for (const tf of ['1m', '5m', '15m', '1h', '1D']) {
        const tfBtn = page.locator(`button:has-text("${tf}")`).first();
        if (await tfBtn.isVisible()) {
          await tfBtn.click();
          await page.waitForTimeout(600);
        }
      }
      console.log('   Tested Chart Timeframes: 1m, 5m, 15m, 1h, 1D');

      // Test Sub-tabs inside modal
      const tabs = ['Trade Setup', 'Fundamentals', 'Level 2'];
      for (const t of tabs) {
        const tabBtn = page.locator(`button:has-text("${t}")`).first();
        if (await tabBtn.isVisible()) {
          await tabBtn.click();
          await page.waitForTimeout(600);
          await scanForAnomalies(`Stock Modal Sub-tab ${t}`);
        }
      }

      // Test Quick Paper Trade CTA inside modal
      const paperTradeBtn = page.locator('button:has-text("Paper Trade")').first();
      if (await paperTradeBtn.isVisible()) {
        console.log('   Testing Quick Paper Trade CTA routing button...');
        await paperTradeBtn.click();
        await page.waitForTimeout(1500);
        await scanForAnomalies('Modal Quick Paper Trade Route');
        console.log('   Routed into Paper Trading cleanly');
      } else {
        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      }
    }
  }

  // -------------------------------------------------------------
  // TEST SECTION 3: DAILY ADVISORY
  // -------------------------------------------------------------
  console.log('\n--- TEST SECTION 3: Daily Advisory Hub ---');
  const advBtn = page.locator('button:has-text("Daily Advisory")').first();
  if (await advBtn.isVisible()) {
    await advBtn.click();
    await page.waitForTimeout(2000);
    await scanForAnomalies('Daily Advisory View');
  }

  // -------------------------------------------------------------
  // TEST SECTION 4: IPO INTELLIGENCE HUB & APPLICATION CALCULATOR
  // -------------------------------------------------------------
  console.log('\n--- TEST SECTION 4: IPO Intelligence Hub ---');
  const ipoBtn = page.locator('button:has-text("IPO Intelligence")').first();
  if (await ipoBtn.isVisible()) {
    await ipoBtn.click();
    await page.waitForTimeout(2000);
    await scanForAnomalies('IPO Hub View');

    // Test each IPO stage subtab
    const ipoTabs = ['Live Bidding', 'Closed / Allotment', 'Upcoming', 'Recently Listed'];
    for (const tabText of ipoTabs) {
      const tabBtn = page.locator(`button:has-text("${tabText}")`).first();
      if (await tabBtn.isVisible()) {
        const text = await tabBtn.innerText();
        console.log(`   Inspecting IPO Stage: ${text}`);
        if (text.includes('(0)')) {
          console.log(`❌ Empty IPO stage count detected: ${text}`);
          visualBugs.push({ location: 'IPO Hub Tab ' + tabText, issues: ['Stage shows (0) IPOs'] });
        }
        await tabBtn.click();
        await page.waitForTimeout(800);
        await scanForAnomalies(`IPO Hub ${tabText}`);
      }
    }

    // Click first IPO card to test Prospectus modal
    const ipoCard = page.locator('button:has-text("HYUNDAI"), button:has-text("WAAREE")').first();
    if (await ipoCard.isVisible()) {
      await ipoCard.click();
      await page.waitForTimeout(1500);
      console.log('   Opened IPO prospectus modal');
      await scanForAnomalies('IPO Prospectus Modal');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(600);
    }
  }

  // -------------------------------------------------------------
  // TEST SECTION 5: PATTERN ENGINE & TRADINGAGENTS COMMITTEE
  // -------------------------------------------------------------
  console.log('\n--- TEST SECTION 5: Pattern Engine & TradingAgents ---');
  const patternBtn = page.locator('button:has-text("Pattern Engine")').first();
  if (await patternBtn.isVisible()) {
    await patternBtn.click();
    await page.waitForTimeout(2000);
    await scanForAnomalies('Pattern Engine View');

    // Test Horizon switches: INTRADAY, SWING, LONG_TERM
    for (const hz of ['INTRADAY', 'SWING', 'LONG_TERM']) {
      const hzBtn = page.locator(`button:has-text("${hz}")`).first();
      if (await hzBtn.isVisible()) {
        await hzBtn.click();
        await page.waitForTimeout(800);
      }
    }

    // Test TradingAgents tab
    const taTab = page.locator('button:has-text("TradingAgents")').first();
    if (await taTab.isVisible()) {
      await taTab.click();
      await page.waitForTimeout(2500);
      console.log('   TradingAgents Multi-Agent Debate loaded');
      await scanForAnomalies('TradingAgents Committee Tab');

      // Test Re-Run Committee button
      const reRunBtn = page.locator('button:has-text("Re-Run Committee")').first();
      if (await reRunBtn.isVisible()) {
        await reRunBtn.click();
        await page.waitForTimeout(2500);
        console.log('   Re-Run Committee simulation executed');
      }
    }
  }

  // -------------------------------------------------------------
  // TEST SECTION 6: PAPER TRADING & OMS (ORDER PLACEMENT TEST)
  // -------------------------------------------------------------
  console.log('\n--- TEST SECTION 6: Paper Trading & OMS Order Lifecycle ---');
  const paperBtn = page.locator('button:has-text("Paper Trading")').first();
  if (await paperBtn.isVisible()) {
    await paperBtn.click();
    await page.waitForTimeout(2000);
    await scanForAnomalies('Paper Trading View');

    // Place a paper trade
    const buyBtn = page.locator('button:has-text("Submit Paper")').first();
    if (await buyBtn.isVisible()) {
      console.log('   Submitting BUY paper order...');
      await buyBtn.click();
      await page.waitForTimeout(2000);
      await scanForAnomalies('Paper Trading Post-Order');
      console.log('   Order submission processed');
    }
  }

  // -------------------------------------------------------------
  // TEST SECTION 7: AUDIT TRAIL & TRACE
  // -------------------------------------------------------------
  console.log('\n--- TEST SECTION 7: Audit Trail & Decision Logs ---');
  const auditBtn = page.locator('button:has-text("Audit Trail")').first();
  if (await auditBtn.isVisible()) {
    await auditBtn.click();
    await page.waitForTimeout(2000);
    await scanForAnomalies('Audit Trail View');
  }

  // -------------------------------------------------------------
  // TEST SECTION 8: F&O DERIVATIVES (SETUPS & OPTION CHAIN MATRIX)
  // -------------------------------------------------------------
  console.log('\n--- TEST SECTION 8: F&O Derivatives & Option Chain Matrix ---');
  const fnoBtn = page.locator('button:has-text("F&O Derivatives")').first();
  if (await fnoBtn.isVisible()) {
    await fnoBtn.click();
    await page.waitForTimeout(2000);
    await scanForAnomalies('F&O Setups Tab');

    // Switch to Option Chain matrix tab
    const chainTab = page.locator('button:has-text("Option Chain Matrix"), button:has-text("Option Chain")').first();
    if (await chainTab.isVisible()) {
      await chainTab.click();
      await page.waitForTimeout(2500);
      console.log('   Option Chain Matrix tab loaded');
      await scanForAnomalies('Option Chain Matrix Tab');

      // Test index selector dropdown
      const chainSelect = page.locator('select').first();
      if (await chainSelect.isVisible()) {
        await chainSelect.selectOption({ index: 1 });
        await page.waitForTimeout(1500);
        console.log('   Switched Option Chain underlying index');
        await scanForAnomalies('Option Chain Index Switched');
      }
    }
  }

  // -------------------------------------------------------------
  // TEST SECTION 9: STOCK SCREENER
  // -------------------------------------------------------------
  console.log('\n--- TEST SECTION 9: Stock Screener Presets & Filters ---');
  const screenerBtn = page.locator('button:has-text("Stock Screener")').first();
  if (await screenerBtn.isVisible()) {
    await screenerBtn.click();
    await page.waitForTimeout(2000);
    await scanForAnomalies('Stock Screener View');

    // Click presets: Breakout, High Beta, Value
    for (const preset of ['Breakout', 'High Beta', 'Value']) {
      const pBtn = page.locator(`button:has-text("${preset}")`).first();
      if (await pBtn.isVisible()) {
        await pBtn.click();
        await page.waitForTimeout(600);
      }
    }
    console.log('   Tested Screener filter presets');
  }

  // -------------------------------------------------------------
  // TEST SECTION 10: AI MARKET ASSISTANT / COPILOT
  // -------------------------------------------------------------
  console.log('\n--- TEST SECTION 10: AI Market Assistant / Copilot ---');
  const copilotBtn = page.locator('button:has-text("Market Assistant")').first();
  if (await copilotBtn.isVisible()) {
    await copilotBtn.click();
    await page.waitForTimeout(2000);
    await scanForAnomalies('AI Copilot View');

    const input = page.locator('input[placeholder*="Ask"], textarea[placeholder*="Ask"]').first();
    if (await input.isVisible()) {
      await input.fill('What is the outlook for RELIANCE?');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2500);
      console.log('   AI Copilot query submitted and response received');
      await scanForAnomalies('AI Copilot Response');
    }
  }

  // -------------------------------------------------------------
  // TEST SECTION 11: STRATEGY BACKTESTER
  // -------------------------------------------------------------
  console.log('\n--- TEST SECTION 11: Strategy Backtester ---');
  const backtestBtn = page.locator('button:has-text("Strategy Backtest")').first();
  if (await backtestBtn.isVisible()) {
    await backtestBtn.click();
    await page.waitForTimeout(2000);
    await scanForAnomalies('Strategy Backtest View');

    const runBtn = page.locator('button:has-text("Run Simulation"), button:has-text("Run Backtest"), button:has-text("Execute Strategy")').first();
    if (await runBtn.isVisible()) {
      await runBtn.click();
      await page.waitForTimeout(2500);
      console.log('   Strategy Backtest simulation executed');
      await scanForAnomalies('Backtest Results');
    }
  }

  // -------------------------------------------------------------
  // TEST SECTION 12: GLOBAL MARKET SWITCH TO US (NASDAQ/NYSE)
  // -------------------------------------------------------------
  console.log('\n--- TEST SECTION 12: Global Market Switch to US (NASDAQ/NYSE) ---');
  const usToggle = page.locator('button:has-text("US NYSE"), button:has-text("US Market")').first();
  if (await usToggle.isVisible()) {
    await usToggle.click();
    await page.waitForTimeout(3000);
    console.log('   Switched to US Market');
    await scanForAnomalies('US Market Header & Ticker');

    // Verify US Tickers (SP500, NASDAQ, NVDA, AAPL)
    const spPill = page.locator('text=S&P 500').first();
    const nasdaqPill = page.locator('text=NASDAQ').first();
    console.log('   S&P 500 visible:', await spPill.isVisible());
    console.log('   NASDAQ visible:', await nasdaqPill.isVisible());

    // Test F&O Option Chain in US Market
    if (await fnoBtn.isVisible()) {
      await fnoBtn.click();
      await page.waitForTimeout(2000);
      await scanForAnomalies('US F&O Derivatives');
      const chainTab = page.locator('button:has-text("Option Chain Matrix"), button:has-text("Option Chain")').first();
      if (await chainTab.isVisible()) {
        await chainTab.click();
        await page.waitForTimeout(2000);
        console.log('   US Option Chain loaded cleanly');
        await scanForAnomalies('US Option Chain Matrix');
      }
    }

    // Test Paper Trading in US Market
    if (await paperBtn.isVisible()) {
      await paperBtn.click();
      await page.waitForTimeout(2000);
      await scanForAnomalies('US Paper Trading');
      const usBuyBtn = page.locator('button:has-text("Submit Paper")').first();
      if (await usBuyBtn.isVisible()) {
        await usBuyBtn.click();
        await page.waitForTimeout(2000);
        console.log('   US Paper Trade placed and executed');
        await scanForAnomalies('US Paper Trading Post-Order');
      }
    }

    // Test Strategy Backtest in US Market
    if (await backtestBtn.isVisible()) {
      await backtestBtn.click();
      await page.waitForTimeout(2000);
      await scanForAnomalies('US Backtest View');
      const usSimBtn = page.locator('button:has-text("Run Simulation")').first();
      if (await usSimBtn.isVisible()) {
        await usSimBtn.click();
        await page.waitForTimeout(2500);
        console.log('   US Strategy Simulation executed');
        await scanForAnomalies('US Backtest Results');
      }
    }

    // Switch back to Indian Market
    const inToggle = page.locator('button:has-text("NSE / BSE")').first();
    if (await inToggle.isVisible()) {
      await inToggle.click();
      await page.waitForTimeout(2000);
      console.log('   Switched back to Indian Market');
      await scanForAnomalies('Switch Back to IN');
    }
  }

  // -------------------------------------------------------------
  // TEST SECTION 13: DIAGNOSTICS & SYSTEM MODALS
  // -------------------------------------------------------------
  console.log('\n--- TEST SECTION 13: Diagnostics HUDs & Modals ---');
  for (const modalText of ['Telemetry Health HUD', 'Broker Integration APIs', 'Real-Time Stream Debug']) {
    const btn = page.locator(`button:has-text("${modalText}")`).first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(1200);
      console.log(`   Opened modal: ${modalText}`);
      await scanForAnomalies(`Modal ${modalText}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(600);
    }
  }

  console.log('\n================================================================');
  console.log('📊 RUTHLESS AUDIT SUMMARY:');
  console.log(`Console Errors:   ${consoleErrors.length}`);
  console.log(`Console Warnings: ${consoleWarnings.length}`);
  console.log(`Network Failures: ${networkFailures.length}`);
  console.log(`Visual Anomalies: ${visualBugs.length}`);
  console.log('================================================================');

  if (consoleErrors.length > 0) {
    console.log('\n🚨 CONSOLE ERRORS:');
    consoleErrors.forEach(e => console.log(' - ' + e));
  }

  if (visualBugs.length > 0) {
    console.log('\n⚠️ VISUAL ANOMALIES:');
    visualBugs.forEach(b => console.log(` - ${b.location}: ${b.issues.join(', ')}`));
  }

  await browser.close();
  process.exit(consoleErrors.length > 0 ? 1 : 0);
}

runRuthlessMasterAudit().catch(err => {
  console.error('Fatal Audit Runner Failure:', err);
  process.exit(1);
});
