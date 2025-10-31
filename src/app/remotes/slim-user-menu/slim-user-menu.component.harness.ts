import { ComponentHarness } from '@angular/cdk/testing'
import { SlimMenuItemHarness } from 'src/app/shared/components/slim-menu-item/slim-menu-item.component.harness'

export class OneCXSlimUserMenuHarness extends ComponentHarness {
  static readonly hostSelector = 'app-slim-user-menu'

  getWrapper = this.locatorForOptional('.slim-user-menu')
  getHeader = this.locatorForOptional('.slim-user-menu-header')
  getHeaderIcon = this.locatorForOptional('.slim-user-menu-header-icon')
  getItems = this.locatorForAll(SlimMenuItemHarness)

  async isHidden(): Promise<boolean> {
    const wrapperElement = await this.getWrapper()
    if (!wrapperElement) {
      return false
    }

    return (await wrapperElement.getAttribute('hidden')) !== null
  }

  async open() {
    const headerElement = await this.getHeader()
    if (headerElement) {
      await headerElement.click()
    }
  }

  async getHeaderText(): Promise<string | null> {
    const headerElement = await this.getHeader()
    if (!headerElement) {
      return null
    }

    return headerElement.text()
  }
}
