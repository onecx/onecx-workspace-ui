import { ComponentHarness, TestElement } from '@angular/cdk/testing'

export class OneCXFooterMenuHarness extends ComponentHarness {
  static readonly hostSelector = 'app-ocx-footer-menu'

  getMenuItems = this.locatorForAll('a')

  async getMenuItem(itemId: string): Promise<TestElement | undefined> {
    const menuItems = await this.getMenuItems()
    const isMenuItemWithId = await Promise.all(
      menuItems.map(async (item) => {
        const id = await item.getAttribute('id')
        return id === itemId
      })
    )
    return menuItems.find((_, index) => isMenuItemWithId[index])
  }
}
