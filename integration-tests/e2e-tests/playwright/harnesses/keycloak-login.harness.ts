import { Page, Locator } from '@playwright/test'

export class KeycloakLoginHarness {
  readonly page: Page

  readonly header: Locator
  readonly headerWrapper: Locator

  readonly loginForm: Locator
  readonly usernameInput: Locator
  readonly passwordInput: Locator
  readonly signInButton: Locator
  readonly showPasswordButton: Locator

  readonly usernameLabel: Locator
  readonly passwordLabel: Locator

  readonly usernameErrorContainer: Locator
  readonly passwordErrorContainer: Locator

  readonly pageTitle: Locator

  constructor(page: Page) {
    this.page = page

    this.header = page.locator('#kc-header')
    this.headerWrapper = page.locator('#kc-header-wrapper')

    this.loginForm = page.locator('#kc-form-login')
    this.usernameInput = page.locator('#username')
    this.passwordInput = page.locator('#password')
    this.signInButton = page.locator('#kc-login')
    this.showPasswordButton = page.locator('[data-password-toggle]')

    this.usernameLabel = page.locator('label[for="username"]')
    this.passwordLabel = page.locator('label[for="password"]')

    this.usernameErrorContainer = page.locator('#input-error-container-username')
    this.passwordErrorContainer = page.locator('#input-error-container-password')

    this.pageTitle = page.locator('#kc-page-title')
  }

  async isVisible(): Promise<boolean> {
    return this.loginForm.isVisible()
  }

  async waitForPage(): Promise<void> {
    await this.loginForm.waitFor({ state: 'visible', timeout: 30000 })
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username)
    await this.passwordInput.fill(password)
    await this.signInButton.click()
  }

  async getRealmName(): Promise<string> {
    return this.headerWrapper.innerText()
  }

  async getPageTitle(): Promise<string> {
    return this.pageTitle.innerText()
  }

  async hasUsernameError(): Promise<boolean> {
    const content = await this.usernameErrorContainer.textContent()
    return content !== null && content.trim().length > 0
  }

  async hasPasswordError(): Promise<boolean> {
    const content = await this.passwordErrorContainer.textContent()
    return content !== null && content.trim().length > 0
  }

  async togglePasswordVisibility(): Promise<void> {
    await this.showPasswordButton.click()
  }

  async isPasswordVisible(): Promise<boolean> {
    const type = await this.passwordInput.getAttribute('type')
    return type === 'text'
  }
}
