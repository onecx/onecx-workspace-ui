import { ComponentHarness } from '@angular/cdk/testing'
import { SpanHarness } from '@onecx/angular-testing'

// A single top-level <p-panelmenu> item. In PrimeNG 19 each top-level model item is rendered as a
// div.p-panelmenu-panel whose header link is a.p-panelmenu-header-link (label span
// p-panelmenu-header-label, icon span p-panelmenu-submenu-icon).
export class PanelMenuPanelHarness extends ComponentHarness {
  static readonly hostSelector = 'div.p-panelmenu-panel'

  private async labelSpan() {
    return this.locatorForOptional(SpanHarness.with({ class: 'p-panelmenu-header-label' }))
  }

  private async anchor() {
    return (await this.locatorFor('a.p-panelmenu-header-link'))()
  }

  async getText(): Promise<string> {
    const label = await (await this.labelSpan())()
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

  // The submenu items of this panel, rendered as li.p-panelmenu-item inside its p-panelmenu-sub.
  async getChildren(): Promise<PanelMenuItemHarness[]> {
    return this.locatorForAll(PanelMenuItemHarness)()
  }
}

// A nested menu item, rendered as li.p-panelmenu-item (the active style class is set on this host).
// Its link is a.p-panelmenu-item-link and its label span p-panelmenu-item-label.
export class PanelMenuItemHarness extends ComponentHarness {
  static readonly hostSelector = 'li.p-panelmenu-item'

  private async labelSpan() {
    return this.locatorForOptional(SpanHarness.with({ class: 'p-panelmenu-item-label' }))
  }

  private async anchor() {
    return (await this.locatorFor('a.p-panelmenu-item-link'))()
  }

  async getText(): Promise<string> {
    const label = await (await this.labelSpan())()
    return (await label?.getText()) ?? ''
  }

  async getLink(): Promise<string | null> {
    return (await this.anchor()).getAttribute('href')
  }

  async getChildren(): Promise<PanelMenuItemHarness[]> {
    return this.locatorForAll(PanelMenuItemHarness)()
  }
}

// The whole <p-panelmenu> component.
export class PanelMenuHarness extends ComponentHarness {
  static readonly hostSelector = 'p-panelmenu'

  async getAllPanels(): Promise<PanelMenuPanelHarness[]> {
    return this.locatorForAll(PanelMenuPanelHarness)()
  }
}
