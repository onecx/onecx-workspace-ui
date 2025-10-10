import { ComponentHarness } from '@angular/cdk/testing'
import { ButtonHarness } from '@onecx/angular-testing'

export class ToggleMenuButtonHarness extends ComponentHarness {
  static hostSelector = 'app-toggle-menu-button'

  getButton = this.locatorForOptional(
    ButtonHarness.with({
      id: 'ocx_vertical_menu_action_toggle'
    })
  )
}
