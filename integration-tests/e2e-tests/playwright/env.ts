import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

function ensureOutDir(dir: string): string {
  const resolvedDir = resolve(dir)
  mkdirSync(resolvedDir, { recursive: true })
  return resolvedDir
}

export const baseURL = process.env.BASE_URL || 'http://onecx.localhost/onecx-shell/admin/workspace'
// Keep test URL on the same origin as auth setup unless explicitly overridden.
export const testURL = process.env.TEST_URL || baseURL

export const outputDir = ensureOutDir(process.env.OUTPUT_DIR || './e2e-results')

export const username = process.env.USERNAME || 'onecx'
export const password = process.env.PASSWORD || 'onecx'
