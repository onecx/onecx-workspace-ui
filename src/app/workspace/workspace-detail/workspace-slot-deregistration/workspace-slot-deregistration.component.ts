import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'

import { SharedModule } from 'src/app/shared/shared.module'

/**
 * Confirmation dialog for deregistering components from a workspace slot.
 * The parent controls visibility and performs the deregistration (and its rollback);
 * this component only emits user intents.
 */
@Component({
  selector: 'app-workspace-slot-deregistration',
  standalone: true,
  imports: [SharedModule],
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
