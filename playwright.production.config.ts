import { defineConfig, devices } from '@playwright/test'

/**
 * Production smoke tests (brief 25.6 step 6): READ-ONLY checks against the live site after the merge, or against a
 * preview. They never sign in, submit a form or write data, so they need no clean-up.
 *   SMOKE_BASE_URL=https://www.hagerland.com npx playwright test -c playwright.production.config.ts
 * A Vercel preview behind Vercel login also needs VERCEL_AUTOMATION_BYPASS_SECRET (Vercel → Deployment Protection).
 */
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET

export default defineConfig({
  testDir: './smoke-prod',
  outputDir: './smoke-prod/.results',
  fullyParallel: false,
  workers: 2,
  retries: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.SMOKE_BASE_URL ?? 'https://www.hagerland.com',
    trace: 'retain-on-failure',
    extraHTTPHeaders: bypass ? { 'x-vercel-protection-bypass': bypass, 'x-vercel-set-bypass-cookie': 'true' } : {},
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
  ],
})
