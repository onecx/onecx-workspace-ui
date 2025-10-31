import { ComponentHarness } from '@angular/cdk/testing'

export class OneCXSlimVerticalMainMenuHarness extends ComponentHarness {
  static readonly hostSelector = 'app-slim-vertical-main-menu'

  getList = this.locatorForOptional('#ws_slim_vertical_main_menu_list')
  getListItems = this.locatorForAll('app-slim-menu-item')

  async isHidden(): Promise<boolean> {
    const listElement = await this.getList()
    if (!listElement) {
      return false
    }

    return (await listElement.getAttribute('hidden')) !== null
  }
}
