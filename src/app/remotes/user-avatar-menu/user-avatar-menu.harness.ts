import { ComponentHarness } from '@angular/cdk/testing'
import { MenuItemWithIconHarness } from '@onecx/angular-testing'

class AvatarMenuItemHarness extends MenuItemWithIconHarness {
  static override readonly hostSelector = 'li > a'

  async click() {
    await (await this.host()).click()
  }
}

export class OneCXUserAvatarMenuHarness extends ComponentHarness {
  static readonly hostSelector = 'app-user-avatar-menu'

  public getUserAvatarButton = this.locatorFor('#ocx_topbar_action_user_avatar_menu')

  public getMenuItems = this.locatorForAll(AvatarMenuItemHarness)

  async getUserAvatarButtonId(): Promise<string | null> {
    return await (await this.getUserAvatarButton()).getAttribute('id')
  }

  async clickButton() {
    await (await this.getUserAvatarButton()).click()
  }

  async getOrganization() {
    return (await this.locatorForOptional('#ws_user_avatar_menu_list_item_0_organization')())?.text()
  }

  async getUserName() {
    return (await this.locatorForOptional('#ws_user_avatar_menu_list_item_0_user_name')())?.text()
  }

  async isMenuHidden() {
    return (await (await this.locatorFor('.layout-topbar-action-panel')()).getAttribute('hidden')) === ''
  }
}
