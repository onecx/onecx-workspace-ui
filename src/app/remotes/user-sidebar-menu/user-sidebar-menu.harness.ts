import { ComponentHarness } from '@angular/cdk/testing'
import { SpanHarness } from '@onecx/angular-testing'

// Local PrimeNG 19 panelmenu harnesses. The shared PPanelMenuHarness/PanelMenuItemHarness in
// @onecx/angular-testing target the previous DOM (icon class p-menuitem-icon and nested li.p-menuitem)
// and do not match the PrimeNG 19 <p-panelmenu> output.
export class PanelMenuPanelHarness extends ComponentHarness {
  static readonly hostSelector = 'div.p-panelmenu-panel'

  private async anchor() {
    return (await this.locatorFor('a.p-panelmenu-header-link'))()
  }

  async getText(): Promise<string> {
    const label = await await this.locatorForOptional(SpanHarness.with({ class: 'p-panelmenu-header-label' }))()
    return (await label?.getText()) ?? ''
  }

  async hasIcon(icon: string): Promise<boolean> {
    const iconSpan = await await this.locatorForOptional(SpanHarness.with({ class: 'p-panelmenu-submenu-icon' }))()
    const cls = (await (await iconSpan?.host())?.getAttribute('class')) ?? ''
    return cls.includes(icon)
  }

  async click(): Promise<void> {
    await (await this.anchor()).click()
  }

  async getLink(): Promise<string | null> {
    return (await this.anchor()).getAttribute('href')
  }

  async getChildren(): Promise<PanelMenuItemHarness[]> {
    return this.locatorForAll(PanelMenuItemHarness)()
  }
}

export class PanelMenuItemHarness extends ComponentHarness {
  static readonly hostSelector = 'li.p-panelmenu-item'

  private async anchor() {
    return (await this.locatorFor('a.p-panelmenu-item-link'))()
  }

  async getText(): Promise<string> {
    const label = await await this.locatorForOptional(SpanHarness.with({ class: 'p-panelmenu-item-label' }))()
    return (await label?.getText()) ?? ''
  }

  async getLink(): Promise<string | null> {
    return (await this.anchor()).getAttribute('href')
  }

  async getChildren(): Promise<PanelMenuItemHarness[]> {
    return this.locatorForAll(PanelMenuItemHarness)()
  }
}

export class PanelMenuHarness extends ComponentHarness {
  static readonly hostSelector = 'p-panelmenu'

  async getAllPanels(): Promise<PanelMenuPanelHarness[]> {
    return this.locatorForAll(PanelMenuPanelHarness)()
  }
}

export class OneCXUserSidebarMenuHarness extends ComponentHarness {
  static readonly hostSelector = 'app-user-sidebar-menu'

  async getPanelMenu(): Promise<PanelMenuHarness | null> {
    return await this.locatorForOptional(PanelMenuHarness)()
  }

  async getDisplayName(): Promise<string> {
    return (await this.locatorFor('#ws_user_sidebar_display_name')()).text()
  }

  async getOrg(): Promise<string | undefined> {
    return (await this.locatorForOptional('#ws_user_sidebar_orgid')())?.text()
  }

  // PrimeNG 19's <p-accordion> (structured API) has no p-accordiontab; the clickable header is the
  // p-accordion-header host, which toggles the panel on click.
  async expandAccordion(): Promise<void> {
    await (await this.locatorFor('p-accordion-header')()).click()
  }
}
