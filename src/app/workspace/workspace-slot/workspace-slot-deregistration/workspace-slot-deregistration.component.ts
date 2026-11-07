import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { TranslateModule } from '@ngx-translate/core'

import { ButtonModule } from 'primeng/button'
import { DialogModule } from 'primeng/dialog'
import { TooltipModule } from 'primeng/tooltip'

/**
 * Confirmation dialog for deregistering components from a workspace slot.
 * The parent controls visibility and performs the deregistration (and its rollback);
 * this component only emits user intents.
 */
@Component({
  selector: 'app-workspace-slot-deregistration',
  standalone: true,
  imports: [TranslateModule, DialogModule, ButtonModule, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workspace-slot-deregistration.component.html'
})
export class WorkspaceSlotDeregistrationComponent {
  public readonly visible = input(false)
  public readonly closeDialog = output<void>()
  public readonly confirm = output<void>()

  public onClose(): void {
    this.closeDialog.emit()
  }

  public onConfirm(): void {
    this.confirm.emit()
  }
}
