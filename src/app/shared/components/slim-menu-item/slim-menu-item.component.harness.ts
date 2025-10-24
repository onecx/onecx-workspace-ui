import { ComponentHarness } from '@angular/cdk/testing'

export class SlimMenuItemHarness extends ComponentHarness {
  static readonly hostSelector = 'app-slim-menu-item'

  getList = this.locatorForOptional('li')
  getAnchor = this.locatorForOptional('a')
  getButton = this.locatorForOptional('button')
  getIcon = this.locatorForOptional('i')
}
