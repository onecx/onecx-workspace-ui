import { ComponentHarness } from '@angular/cdk/testing'

/**
 * A single entry of the user avatar menu. The items (including logout) are rendered by
 * `app-vertical-menu-item`, which outputs a `<a>` element (router link, external url or command).
 */
export class UserAvatarMenuItemHarness extends ComponentHarness {
  static readonly hostSelector = 'li a'

  async click() {
    await (await this.host()).click()
  }

  async getText() {
    return (await this.host()).text()
  }

  async getLink() {
    return (await this.host()).getAttribute('href')
  }

  /**
   * The menu item icon is rendered by `app-vertical-menu-item` as a `<span>` carrying the
   * PrimeIcon classes (e.g. `pi pi-home`). `icon` is the plain icon name (e.g. `pi-home`).
   */
  async hasIcon(icon: string) {
    const iconElement = await this.locatorForOptional('span[class*="pi-"]')()
    const classes = (await iconElement?.getAttribute('class')) ?? ''
    return classes.includes(icon)
  }
}

export class OneCXUserAvatarMenuHarness extends ComponentHarness {
  static readonly hostSelector = 'app-user-avatar-menu'

  public getUserAvatarButton = this.locatorFor('#ocx_topbar_action_user_avatar_menu')
  public getMenuItems = this.locatorForAll(UserAvatarMenuItemHarness)

  /** The logout item is the menu entry carrying the power-off icon. */
  async getLogoutMenuItem(): Promise<UserAvatarMenuItemHarness> {
    const items = await this.locatorForAll(UserAvatarMenuItemHarness)()
    for (const item of items) {
      if (await item.hasIcon('pi-power-off')) {
        return item
      }
    }
    throw new Error('Logout menu item not found')
  }

  async getUserAvatarButtonId() {
    return (await this.getUserAvatarButton()).getAttribute('id')
  }

  /**
   * Click the avatar button. The `p-button` host wraps a real inner `<button>` (the visible,
   * clickable control); clicking the host element directly does not reach the `(onClick)` handler.
   * Clicking the inner button bubbles up to the host, which toggles the menu (and stops propagation
   * so the document:click close listener does not immediately undo it).
   */
  async clickButton() {
    await (await this.locatorFor('#ocx_topbar_action_user_avatar_menu button')()).click()
  }

  async getOrganization() {
    return (await this.locatorForOptional('#ws_user_avatar_menu_list_item_0_organization')())?.text()
  }

  async getUserName() {
    return (await this.locatorForOptional('#ws_user_avatar_menu_list_item_0_user_name')())?.text()
  }

  async isMenuHidden() {
    const classes = (await (await this.locatorFor('#ws_user_avatar_menu_list')()).getAttribute('class')) ?? ''
    return classes.includes('hidden')
  }
}
