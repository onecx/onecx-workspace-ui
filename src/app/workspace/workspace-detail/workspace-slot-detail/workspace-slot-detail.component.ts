import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { SlotAPIService, UpdateSlotRequest, Workspace } from 'src/app/shared/generated'
import { ChangeMode, CombinedSlot } from '../workspace-slots/workspace-slots.component'

@Component({
  selector: 'app-workspace-slot-detail',
  templateUrl: './workspace-slot-detail.component.html'
})
export class WorkspaceSlotDetailComponent implements OnChanges {
  @Input() workspace!: Workspace | undefined
  @Input() slot: CombinedSlot | undefined
  @Input() changeMode: ChangeMode = 'VIEW'
  @Input() displayDetailDialog = false
  @Input() displayDeleteDialog = false
  @Output() dataChanged: EventEmitter<boolean> = new EventEmitter()

  constructor(
    private slotApi: SlotAPIService,
    private translate: TranslateService,
    private msgService: PortalMessageService
  ) {}

  public ngOnChanges(): void {
    console.log('ngOnChanges')
  }

  public onClose(): void {
    this.dataChanged.emit(false)
  }

  /**
   * Add a Slot Component
   */
  public onSaveSlot(): void {
    console.log('ngOnChanges')
  }

  /**
   * Remove a Slot Component
   */
  public onDeleteSlotComponentConfirmation() {
    this.slotApi.updateSlot({ id: this.slot?.id ?? '', updateSlotRequest: {} as UpdateSlotRequest }).subscribe({
      next: () => {
        this.msgService.success({ summaryKey: 'ACTIONS.DELETE.ROLE_OK' })
        this.dataChanged.emit(true)
      },
      error: (err) => {
        this.msgService.error({ summaryKey: 'ACTIONS.DELETE.ROLE_NOK' })
        console.error(err.error)
      }
    })
  }
}
