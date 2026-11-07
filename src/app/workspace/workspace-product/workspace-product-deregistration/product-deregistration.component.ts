import { Component, EventEmitter, Input, Output } from '@angular/core'
import { TranslateModule } from '@ngx-translate/core'

import { ButtonModule } from 'primeng/button'
import { DialogModule } from 'primeng/dialog'
import { TooltipModule } from 'primeng/tooltip'

/**
 * Confirmation dialog for deregistering (removing) workspace products.
 * Extracted from the products component. The parent controls visibility via
 * the two-way `visible` binding; the actual deregistration (and its rollback)
 * is performed by the parent, so this component only emits user intents.
 */
@Component({
  selector: 'app-product-deregistration',
  standalone: true,
  imports: [TranslateModule, ButtonModule, DialogModule, TooltipModule],
  templateUrl: './product-deregistration.component.html',
  styleUrls: ['./product-deregistration.component.scss']
})
export class ProductDeregistrationComponent {
  @Input() public visible = false
  @Output() public closeDialog = new EventEmitter<void>()
  @Output() public confirm = new EventEmitter<void>()

  public onClose(): void {
    this.closeDialog.emit()
  }

  public onConfirm(): void {
    this.confirm.emit()
  }
}
