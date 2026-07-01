import { Page, Locator } from '@playwright/test'

export class WorkspaceSearchHarness {
  readonly page: Page

  readonly workspaceComponent: Locator
  readonly portalPage: Locator

  readonly pageHeader: Locator
  readonly pageHeaderWrapper: Locator
  readonly pageTitle: Locator
  readonly pageSubtitle: Locator
  readonly titleSection: Locator

  readonly breadcrumb: Locator
  readonly breadcrumbHome: Locator
  readonly breadcrumbItems: Locator
  readonly breadcrumbHomeLink: Locator
  readonly breadcrumbWorkspaceLink: Locator

  readonly toolbar: Locator
  readonly actionButtons: Locator
  readonly createButton: Locator
  readonly importButton: Locator

  readonly dataView: Locator
  readonly dataViewControls: Locator
  readonly searchResults: Locator
  readonly workspaceCards: Locator

  readonly paginator: Locator
  readonly paginatorInfo: Locator
  readonly paginatorFirstButton: Locator
  readonly paginatorPrevButton: Locator
  readonly paginatorNextButton: Locator
  readonly paginatorLastButton: Locator

  readonly searchInput: Locator

  readonly createDialog: Locator
  readonly importDialog: Locator

  constructor(page: Page) {
    this.page = page

    this.workspaceComponent = page.locator('ocx-workspace-component')
    this.portalPage = page.locator('ocx-portal-page')

    this.pageHeader = page.locator('ocx-page-header')
    this.pageHeaderWrapper = page.locator('[name="ocx-page-header-wrapper"]')
    this.pageTitle = page.locator('#page-header')
    this.pageSubtitle = page.locator('#page-subheader')
    this.titleSection = page.locator('section.header[aria-label="Page Header"]')

    this.breadcrumb = page.locator('p-breadcrumb')
    this.breadcrumbHome = page.locator('.p-breadcrumb-home')
    this.breadcrumbItems = page.locator('.p-breadcrumb-list li.p-element')
    this.breadcrumbHomeLink = page.locator('.p-breadcrumb-home a')
    this.breadcrumbWorkspaceLink = page.locator('.p-breadcrumb-list li[data-pc-section="menuitem"] a')

    this.toolbar = page.locator('.toolbar')
    this.actionButtons = page.locator('.action-button')
    this.createButton = page.locator('.toolbar button:has(.pi-plus)')
    this.importButton = page.locator('.toolbar button:has(.pi-upload)')

    this.dataView = page.locator('#ws_search_dataview')
    this.dataViewControls = page.locator('ocx-data-view-controls')
    this.searchResults = page.locator('section[aria-label="Suchergebnisse: Workspaces"]')
    this.workspaceCards = page.locator('article[aria-label^="Workspace:"]')

    this.paginator = page.locator('p-paginator')
    this.paginatorInfo = page.locator('.p-paginator-current')
    this.paginatorFirstButton = page.locator('.p-paginator-first')
    this.paginatorPrevButton = page.locator('.p-paginator-prev')
    this.paginatorNextButton = page.locator('.p-paginator-next')
    this.paginatorLastButton = page.locator('.p-paginator-last')

    this.searchInput = page.locator('.p-inputgroup input[type="text"]')

    this.createDialog = page.locator('app-workspace-create p-dialog')
    this.importDialog = page.locator('app-workspace-import p-dialog')
  }

  async isVisible(): Promise<boolean> {
    return this.workspaceComponent.isVisible()
  }

  async waitForPage(): Promise<void> {
    // Reduzierter Timeout für schnelleres Feedback
    await this.workspaceComponent.waitFor({ state: 'visible', timeout: 15000 })
    await this.pageHeader.waitFor({ state: 'visible', timeout: 10000 })
  }

  async getPageTitle(): Promise<string> {
    return this.pageTitle.innerText()
  }

  async getPageSubtitle(): Promise<string> {
    return this.pageSubtitle.innerText()
  }

  async isHeaderVisible(): Promise<boolean> {
    return this.pageHeader.isVisible()
  }

  async getBreadcrumbItems(): Promise<string[]> {
    const items = await this.breadcrumbItems.allInnerTexts()
    return items.filter((item) => item.trim().length > 0)
  }

  async getWorkspaceCardCount(): Promise<number> {
    return this.workspaceCards.count()
  }

  async getWorkspaceNames(): Promise<string[]> {
    const cards = await this.workspaceCards.all()
    const names: string[] = []
    for (const card of cards) {
      const ariaLabel = await card.getAttribute('aria-label')
      if (ariaLabel) {
        // Format: "Workspace: OneCX Admin"
        const name = ariaLabel.replace('Workspace: ', '')
        names.push(name)
      }
    }
    return names
  }

  async clickWorkspace(name: string): Promise<void> {
    const card = this.page.locator(`article[aria-label="Workspace: ${name}"]`)
    await card.click()
  }

  async getPaginatorInfo(): Promise<string> {
    return this.paginatorInfo.innerText()
  }

  async isPaginatorVisible(): Promise<boolean> {
    return this.paginator.isVisible()
  }

  async getActionButtonCount(): Promise<number> {
    return this.actionButtons.count()
  }

  async clickFirstActionButton(): Promise<void> {
    await this.actionButtons.first().click()
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query)
    // Trigger search (Enter oder automatisch)
    await this.searchInput.press('Enter')
  }

  async isDataViewVisible(): Promise<boolean> {
    return this.dataView.isVisible()
  }

  async waitForSearchResults(): Promise<void> {
    await this.searchResults.waitFor({ state: 'visible', timeout: 30000 })
  }

  async getCreateButtonLabel(): Promise<string> {
    return (await this.createButton.locator('.p-button-label').innerText()).trim()
  }

  async getImportButtonLabel(): Promise<string> {
    return (await this.importButton.locator('.p-button-label').innerText()).trim()
  }

  async getBreadcrumbHomeHref(): Promise<string | null> {
    return this.breadcrumbHomeLink.getAttribute('href')
  }

  async getBreadcrumbWorkspaceText(): Promise<string> {
    return (await this.breadcrumbWorkspaceLink.last().innerText()).trim()
  }
}
