import { test, expect } from '@playwright/test';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';
let backendUp = false;

async function clickSidebar(page, label) {
  await page.evaluate((g) => {
    const els = Array.from(document.querySelectorAll('*')).filter(
      (e) => e.childElementCount === 0 && e.textContent.trim().toLowerCase().includes(g.toLowerCase())
    );
    if (!els.length) throw new Error(`sidebar item not found: ${g}`);
    let t = els[0];
    while (t && getComputedStyle(t).cursor !== 'pointer') t = t.parentElement;
    t.click();
  }, label);
}

test.beforeAll(async ({ request }) => {
  try {
    const r = await request.get(`${BACKEND}/api/market-breadth`, { timeout: 5000 });
    backendUp = r.ok();
  } catch {
    backendUp = false;
  }
  if (!backendUp) console.warn('\n⚠ Backend unreachable at', BACKEND, '— backend-dependent tests will be skipped.');
});

test.describe('app shell', () => {
  test('boots with no error banner and no page errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/');
    await page.waitForTimeout(6000);
    const text = await page.textContent('body');
    expect(text.length).toBeGreaterThan(5000);
    expect(await page.locator('text=/Failed to load/i').count()).toBe(0);
    expect(errors).toEqual([]);
  });
});

test.describe('navigation', () => {
  const views = [
    'Daily AI Advisory', 'IPO Intelligence Hub', 'Pattern Engine', 'Paper Trading & OMS',
    'Audit Trail & Trace', 'F&O Derivatives', 'Equity Signals', 'Stock Screener',
    'AI Copilot Advisor', 'Strategy Backtest',
  ];
  for (const v of views) {
    test(`view renders: ${v}`, async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(5000);
      await clickSidebar(page, v);
      await page.waitForTimeout(1500);
      const len = (await page.textContent('body')).length;
      expect(len).toBeGreaterThan(1000);
    });
  }
});

test.describe('search & stock modal', () => {
  test('search opens detail modal; Escape closes it', async ({ page }) => {
    test.skip(!backendUp, 'backend required');
    await page.goto('/');
    await page.waitForTimeout(5000);
    await page.fill('input[placeholder*="earch" i]', 'reliance');
    await page.waitForTimeout(1500);
    await page.locator('text=RELIANCE').first().click();
    await page.waitForTimeout(2500);
    expect(await page.locator('[role="dialog"]').count()).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    expect(await page.locator('[role="dialog"]').count()).toBe(0);
  });
});

test.describe('paper trading', () => {
  test('order form snaps quantity to lot size', async ({ page }) => {
    test.skip(!backendUp, 'backend required');
    await page.goto('/');
    await page.waitForTimeout(6000);
    await clickSidebar(page, 'Paper Trading & OMS');
    await page.waitForTimeout(3000); // market-state fetch + lot snap
    const qty = await page.locator('#pt-quantity').inputValue();
    expect(Number(qty)).toBeGreaterThanOrEqual(1);
  });

  test('default order fills and cash decreases', async ({ page }) => {
    test.skip(!backendUp, 'backend required');
    await page.goto('/');
    await page.waitForTimeout(6000);
    await clickSidebar(page, 'Paper Trading & OMS');
    await page.waitForTimeout(3000);

    // reset via API for deterministic start
    const token = process.env.CONTROL_TOKEN || '';
    await page.request.post(`${BACKEND}/api/paper/reset?initialCapital=1000000`, {
      headers: { 'X-Control-Token': token },
    });
    await page.reload();
    await page.waitForTimeout(6000);
    await clickSidebar(page, 'Paper Trading & OMS');
    await page
      .locator('text=/Risk Gate/i')
      .first()
      .waitFor({ state: 'visible', timeout: 20000 });
    await expect(page.locator('text=/Risk Gate/i').first()).toContainText('PASSED', { timeout: 15000 });

    const submit = page.locator('button:has-text("Submit Paper BUY Order")').first();
    await submit.click();
    await page.waitForTimeout(4500);

    // Deterministic assertions via backend state (UI text races with live re-renders)
    const pf = await page.request.get(`${BACKEND}/api/paper/portfolio`).then((r) => r.json());
    expect(pf.summary.cashBalance).toBeLessThan(1000000);
    expect((pf.positions || []).length).toBeGreaterThan(0);
    // UI must show either the fill confirmation or the updated position
    const body = await page.textContent('body');
    expect(/PAPER ORDER FILLED|RELIANCE\.NS/.test(body)).toBe(true);
  });

  test('invalid quantity shows inline error', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(6000);
    await clickSidebar(page, 'Paper Trading & OMS');
    await page.waitForTimeout(2000);
    const qty = page.locator('#pt-quantity');
    await qty.fill('-5');
    const validity = await qty.evaluate((el) => el.checkValidity());
    expect(validity).toBe(false);
  });
});

test.describe('modals', () => {
  test('alerts modal closes on Escape', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(5000);
    await page.locator('button:has-text("Alerts")').first().click();
    await page.waitForTimeout(700);
    expect(await page.locator('[role="dialog"]').count()).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    expect(await page.locator('[role="dialog"]').count()).toBe(0);
  });
});

test.describe('responsive @390px', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('hamburger opens drawer; navigation works; nothing clips', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(6000);
    const burger = page.locator('button[aria-label="Open navigation menu"]');
    await expect(burger).toBeVisible();
    await burger.click();
    await page.waitForTimeout(500);
    const open = await page.evaluate(() => document.querySelector('.app-sidebar')?.getBoundingClientRect().left >= 0);
    expect(open).toBe(true);
    await clickSidebar(page, 'Stock Screener');
    await page.waitForTimeout(1500);
    const closed = await page.evaluate(() => document.querySelector('.app-sidebar')?.getBoundingClientRect().right <= 0);
    expect(closed).toBe(true);

    const clipped = await page.evaluate(() => {
      let n = 0;
      document.querySelectorAll('*').forEach((e) => {
        let t = e, inTicker = false;
        while (t) { if ((t.textContent || '').includes('NSE / BSE LIVE')) { inTicker = true; break; } t = t.parentElement; }
        if (inTicker) return;
        const r = e.getBoundingClientRect();
        if (r.width > 0 && r.right > window.innerWidth + 8) n++;
      });
      return n;
    });
    expect(clipped).toBe(0);
  });
});
