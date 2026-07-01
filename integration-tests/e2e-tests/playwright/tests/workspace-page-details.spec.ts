import * as fs from 'fs'
import { test, expect } from '../harnesses/ocx-base.fixture'
import { WorkspaceSearchHarness } from '../harnesses'
import { t } from '../harnesses/i18n'

const outputDir = process.env.OUTPUT_DIR || '/e2e-results'

fs.mkdirSync(`${outputDir}/screenshots`, { recursive: true })

test.describe('Workspace Page Details', () => {
  let harness: WorkspaceSearchHarness

  test.beforeEach(async ({ page }) => {
    harness = new WorkspaceSearchHarness(page)
    await page.goto('')
    await page.waitForLoadState('domcontentloaded')
    if (page.url().includes('/realms/')) {
      throw new Error(`Auth failed – redirected to Keycloak: ${page.url()}`)
    }
    await harness.waitForPage()
  })

  test.describe('Action Toolbar', () => {
    test('create button label matches locale', async () => {
      expect(await harness.getCreateButtonLabel()).toBe(t('create_button_label'))
    })

    test('import button label matches locale', async () => {
      expect(await harness.getImportButtonLabel()).toBe(t('import_button_label'))
    })
  })

  test.describe('Breadcrumb', () => {
    test('home link is visible', async () => {
      await expect(harness.breadcrumbHomeLink).toBeVisible()
    })

    test('home link href contains /onecx-shell/admin', async () => {
      const href = await harness.getBreadcrumbHomeHref()
      expect(href).toContain('/onecx-shell/admin')
    })

    test('last breadcrumb item text matches locale', async () => {
      expect(await harness.getBreadcrumbWorkspaceText()).toContain(t('breadcrumb_workspace'))
    })
  })

  test.describe('DataView and Screenshot', () => {
    test('page title and subtitle match locale', async () => {
      expect(await harness.getPageTitle()).toBe(t('page_title'))
      expect(await harness.getPageSubtitle()).toBe(t('page_subtitle'))
    })
  })
})
