import { Component, EventEmitter, Input, Output } from '@angular/core'

import { SharedModule } from 'src/app/shared/shared.module'

/**
 * Confirmation dialog for deregistering (removing) workspace products.
 * Extracted from the products component. The parent controls visibility via
 * the two-way `visible` binding; the actual deregistration (and its rollback)
 * is performed by the parent, so this component only emits user intents.
 */
@Component({
  selector: 'app-product-deregistration',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './product-deregistration.component.html',
  styleUrls: ['./product-deregistration.component.scss']
})
export class ProductDeregistrationComponent {
  @Input() public visible = false
  @Output() public cancel = new EventEmitter<void>()
  @Output() public confirm = new EventEmitter<void>()

  public onCancel(): void {
    this.cancel.emit()
  }

  public onConfirm(): void {
    this.confirm.emit()
  }
}
