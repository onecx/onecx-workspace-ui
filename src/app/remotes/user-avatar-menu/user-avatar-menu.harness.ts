import { ComponentHarness } from '@angular/cdk/testing'
import { MenuItemWithIconHarness } from '@onecx/angular-testing'

export class OneCXUserAvatarMenuHarness extends ComponentHarness {
  static readonly hostSelector = 'app-user-avatar-menu'

  getUserAvatarButton = this.locatorFor('#user-avatar-menu-button')

  getMenuItems = this.locatorForAll(MenuItemWithIconHarness)

  async getUserAvatarButtonId(): Promise<string | null> {
    return await (await this.getUserAvatarButton()).getAttribute('id')
  }

  async clickButton() {
    await (await this.getUserAvatarButton()).click()
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
