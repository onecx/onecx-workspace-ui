import { ComponentHarness } from '@angular/cdk/testing'

export class SlimMenuItemHarness extends ComponentHarness {
  static readonly hostSelector = 'app-slim-menu-item'

  getList = this.locatorForOptional('li')
  getAnchor = this.locatorForOptional('a')
  getButton = this.locatorForOptional('button')
  getIcon = this.locatorForOptional('i')

  async click() {
    const anchorElement = await this.getAnchor()
    if (anchorElement) {
      await anchorElement.click()
      return
    }

    const buttonElement = await this.getButton()
    if (buttonElement) {
      await buttonElement.click()
    }
  }
}
