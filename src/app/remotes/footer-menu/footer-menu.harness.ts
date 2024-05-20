import { ComponentHarness } from '@angular/cdk/testing'

export class OneCXFooterMenuHarness extends ComponentHarness {
  static readonly hostSelector = 'app-ocx-footer-menu'

  getMenuItems = this.locatorForAll('a')
}
