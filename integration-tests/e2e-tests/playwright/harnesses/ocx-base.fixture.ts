import { test as base, Page, ConsoleMessage, Request, Response } from '@playwright/test'
import * as fs from 'fs'

const outputDir = process.env.OUTPUT_DIR || '/e2e-results'
const logsDir = `${outputDir}/logs`

// Create log directories once at module load (once per worker process)
fs.mkdirSync(logsDir, { recursive: true })

function appendLog(filename: string, line: string): void {
  fs.appendFileSync(`${logsDir}/${filename}`, line + '\n', { encoding: 'utf8' })
}

/**
 * Generic base fixture for all OneCX MFE E2E tests.
 *
 * Auto-attaches browser console, page error and network listeners to every
 * test. Writes to:
 *   ${OUTPUT_DIR}/logs/browser-console.log
 *   ${OUTPUT_DIR}/logs/page-errors.log
 *   ${OUTPUT_DIR}/logs/network.log
 *
 * Usage: import { test, expect } from '../harnesses/ocx-base.fixture'
 * instead of '@playwright/test'. No MFE-specific imports — copy unchanged
 * to any other OneCX e2e image.
 */
export const test = base.extend<{ _autoLogs: void }>({
  _autoLogs: [
    async ({ page }: { page: Page }, use: () => Promise<void>) => {
      page.on('console', (msg: ConsoleMessage) => {
        const loc = msg.location()
        appendLog(
          'browser-console.log',
          `[${msg.type()}] ${msg.text()}  @ ${loc.url}:${loc.lineNumber}:${loc.columnNumber}`
        )
      })

      page.on('pageerror', (err: Error) => {
        appendLog('page-errors.log', `[pageerror] ${err.message}\n${err.stack ?? ''}`)
      })

      page.on('request', (req: Request) => {
        appendLog('network.log', `>> ${req.method()} ${req.url()}`)
      })

      page.on('response', (res: Response) => {
        appendLog('network.log', `<< ${res.status()} ${res.url()}`)
      })

      page.on('requestfailed', (req: Request) => {
        appendLog('network.log', `XX ${req.url()} — ${req.failure()?.errorText ?? 'unknown'}`)
      })

      await use()
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'
