import { Component } from '@angular/core'

import { StandaloneShellModule } from '@onecx/angular-standalone-shell'
import { AngularAcceleratorModule } from '@onecx/angular-accelerator'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AngularAcceleratorModule, StandaloneShellModule],
  templateUrl: './app.component.html'
})
export class AppComponent {
  title = 'onecx-ui'
}
