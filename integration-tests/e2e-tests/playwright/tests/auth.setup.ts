import { test as setup } from '@playwright/test'
import { KeycloakLoginHarness } from '../harnesses'
import { outputDir, baseURL, username, password } from '../env'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const authFile = `${outputDir}/.auth/user.json`
mkdirSync(dirname(authFile), { recursive: true })

setup('Keycloak Authentication', async ({ page }) => {
  if (!baseURL) {
    throw new Error('[Auth Setup] BASE_URL is not set')
  }

  await page.goto(baseURL)
  await page.waitForLoadState('domcontentloaded')

  const keycloakHarness = new KeycloakLoginHarness(page)

  try {
    await keycloakHarness.waitForPage()

    await keycloakHarness.login(username, password)

    await page.waitForURL((url) => !url.href.includes('/realms/'), {
      timeout: 30000
    })

    await page.waitForFunction(
      () => {
        const hash = window.location.hash
        const hasCode = hash.includes('code=')
        const appLoaded = document.querySelector('ocx-shell') || document.querySelector('app-root')
        return !hasCode || appLoaded
      },
      { timeout: 15000 }
    )

    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
  } catch (error) {
    console.log(`[Auth Setup] Error: ${error}`)
  }

  await page.waitForLoadState('domcontentloaded')

  await page.waitForTimeout(3000)

  await page.context().storageState({ path: authFile })
  console.log(`[Auth Setup] Auth-State gespeichert: ${authFile}`)
})
