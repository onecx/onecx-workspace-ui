import { defineConfig, devices } from '@playwright/test'
import { baseURL, outputDir } from './env'

if (!baseURL) {
  throw new Error(
    '[playwright.config] BASE_URL is not set. Pass -e BASE_URL=http://<host>:<port>/... to the container.'
  )
}

export default defineConfig({
  testDir: './tests',

  globalSetup: undefined,

  fullyParallel: false,
  workers: 1,

  reporter: [
    ['html', { outputFolder: `${outputDir}/playwright-report`, open: 'never' }],
    ['json', { outputFile: `${outputDir}/test-results.json` }],
    ['junit', { outputFile: `${outputDir}/test-results.xml` }],
    ['list']
  ],

  timeout: 30000, // 30 Sekunden pro Test
  expect: {
    timeout: 5000 // 5 Sekunden für Assertions
  },

  use: {
    baseURL,

    trace: 'on',

    screenshot: 'on',

    video: 'on',

    viewport: { width: 1920, height: 1080 },

    navigationTimeout: 15000,

    actionTimeout: 10000,

    ignoreHTTPSErrors: true,

    locale: 'en-EN',

    timezoneId: 'Europe/Berlin'
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-web-security']
        }
      }
    },

    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: `${outputDir}/.auth/user.json`,
        launchOptions: {
          args: ['--disable-web-security']
        }
      },
      dependencies: ['setup']
    }
  ],

  webServer: undefined
})
