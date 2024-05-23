import { ComponentHarness } from '@angular/cdk/testing'
import { MenuItemWithIconHarness } from '@onecx/angular-testing'

export class OneCXUserAvatarMenuHarness extends ComponentHarness {
  static readonly hostSelector = 'app-user-avatar-menu'

  getButton = this.locatorFor('#user-avatar-menu-button')

  getMenuItems = this.locatorForAll(MenuItemWithIconHarness)

  async getButtonTitle(): Promise<string | null> {
    return await (await this.getButton()).getAttribute('title')
  }

  async clickButton() {
    await (await this.getButton()).click()
  }

  async getUserName() {
    return (await this.locatorForOptional('#user-avatar-profile-item-name')())?.text()
  }

  async getUserEmail() {
    return (await this.locatorForOptional('#user-avatar-profile-item-email')())?.text()
  }

  async getUserTenant() {
    return (await this.locatorForOptional('#user-avatar-profile-item-tenant')())?.text()
  }

  async isMenuHidden() {
    return (await (await this.locatorFor('.layout-topbar-action-panel')()).getAttribute('hidden')) === ''
  }
}
