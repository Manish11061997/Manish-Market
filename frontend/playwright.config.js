import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 1,
  // Projects share one backend portfolio; parallel workers race the paper-trading
  // tests against each other (desktop fill invalidates mobile's preview). Serialize.
  workers: 1,
  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173',
    port: 5173,
    reuseExistingServer: true,
    timeout: 30_000,
    env: {
      VITE_CONTROL_TOKEN: process.env.CONTROL_TOKEN || '',
      VITE_API_BASE: process.env.BACKEND_URL || 'http://localhost:8000',
    },
  },
});
