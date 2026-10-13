import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests run against a production build that talks to the LOCAL Supabase stack
 * (supabase/local-stack), never the live project. See e2e/README.md.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } }, dependencies: ['setup'] },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } }, dependencies: ['setup'], testIgnore: /flows\// },
  ],
  webServer: {
    command: 'npx next start -p 3100',
    url: 'http://localhost:3100/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
