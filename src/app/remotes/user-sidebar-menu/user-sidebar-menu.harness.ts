import { ComponentHarness } from '@angular/cdk/testing'
import { PPanelMenuHarness, PAccordionHarness } from '@onecx/angular-testing'

export class OneCXUserSidebarMenuHarness extends ComponentHarness {
  static readonly hostSelector = 'app-user-sidebar-menu'

  getPanelMenu = this.locatorForOptional(PPanelMenuHarness)
  getAccordion = this.locatorFor(PAccordionHarness)

  async getDisplayName() {
    return await (await this.locatorFor('#user-sidebar-display-name')()).text()
  }

  async expand() {
    const tabs = await (await this.getAccordion()).getAllAccordionTabs()
    await tabs[0].expand()
  }
}
