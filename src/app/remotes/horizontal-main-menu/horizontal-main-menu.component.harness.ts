import { ComponentHarness } from '@angular/cdk/testing'
import { SpanHarness } from '@onecx/angular-testing'

/**
 * Harness for the PrimeNG 19 <p-menubar>. PrimeNG 19 renders `li.p-menubar-item` (with an
 * `a.p-menubar-item-link` anchor and `span.p-menubar-item-label` / `span.p-menubar-item-icon`)
 * and submenus as `ul.p-menubar-submenu` - the older `PMenuBarHarness`/`PMenuItemHarness` from
 * @onecx/angular-testing target the previous `li.p-menuitem` DOM and do not match.
 */
export class MenuBarItemHarness extends ComponentHarness {
  static readonly hostSelector = 'li.p-menubar-item'

  private async anchor() {
    return (await this.locatorFor('a'))()
  }

  async getText(): Promise<string> {
    return (await this.anchor()).text()
  }

  async hasIcon(icon: string): Promise<boolean> {
    const iconSpan = await await this.locatorForOptional(SpanHarness.with({ class: 'p-menubar-item-icon' }))()
    const cls = await (await iconSpan?.host())?.getAttribute('class')
    return cls ? cls.includes(icon) : false
  }

  async click(): Promise<void> {
    await (await this.anchor()).click()
  }

  async getLink(): Promise<string | null> {
    return (await this.anchor()).getAttribute('href')
  }

  async getChildren(): Promise<MenuBarItemHarness[]> {
    return this.locatorForAll(MenuBarItemHarness)()
  }
}

export class MenuBarHarness extends ComponentHarness {
  static readonly hostSelector = 'p-menubar'

  async getAllMenuItems(): Promise<MenuBarItemHarness[]> {
    return this.locatorForAll(MenuBarItemHarness)()
  }
}
