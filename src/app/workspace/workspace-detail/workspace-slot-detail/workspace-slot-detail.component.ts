import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'

import { SlotAPIService, UpdateSlotRequest, Workspace } from 'src/app/shared/generated'
import { ChangeMode, CombinedSlot, ExtendedComponent } from '../workspace-slots/workspace-slots.component'

@Component({
  selector: 'app-workspace-slot-detail',
  templateUrl: './workspace-slot-detail.component.html',
  styleUrls: ['./workspace-slot-detail.component.scss']
})
export class WorkspaceSlotDetailComponent implements OnChanges {
  @Input() workspace!: Workspace | undefined
  @Input() slot: CombinedSlot | undefined
  @Input() psComponentsOrg!: ExtendedComponent[]

  @Input() changeMode: ChangeMode = 'VIEW'
  @Input() displayDetailDialog = false
  @Input() displayDeleteDialog = false
  @Output() dataChanged: EventEmitter<boolean> = new EventEmitter()

  public wComponents!: ExtendedComponent[]
  public psComponents!: ExtendedComponent[] // org ps components reduced by used in slot
  public hasEditPermission = false
  public displayDeregisterConfirmation = false
  private deregisterItems: ExtendedComponent[] = []

  constructor(
    private slotApi: SlotAPIService,
    private user: UserService,
    private translate: TranslateService,
    private msgService: PortalMessageService
  ) {
    this.hasEditPermission = this.user.hasPermission('WORKSPACE_SLOT#EDIT')
  }

  public sortComponentsByName(a: ExtendedComponent, b: ExtendedComponent): number {
    return (a.name ? a.name.toUpperCase() : '').localeCompare(b.name ? b.name.toUpperCase() : '')
  }

  public ngOnChanges(): void {
    if (this.slot) {
      console.log('slot detail ngOnChanges')
      // extract ps components
      this.wComponents = this.slot.psComponents ?? []
      this.wComponents.sort(this.sortComponentsByName)
      this.psComponents = []
      this.psComponentsOrg.forEach((c) => {
        if (this.wComponents.filter((wc) => wc.name === c.name).length === 0) this.psComponents.push(c)
      })
      this.psComponents.sort(this.sortComponentsByName)
    }
  }

  public onClose(): void {
    this.dataChanged.emit(false)
  }

  /**
   * UI Events: DETAIL
   */
  return(event: any) {
    event.stopPropagation()
  }
  public onMoveToSource(event: any): void {
    this.deregisterItems = [...event.items]
    this.displayDeregisterConfirmation = true
  }
  public onDeregisterCancellation() {
    this.displayDeregisterConfirmation = false
    // restore
    for (let comp of this.deregisterItems) {
      this.psComponents = this.psComponents.filter((psc) => psc.name !== comp.name)
      this.wComponents.push(comp)
    }
    this.deregisterItems = []
    this.psComponents.sort(this.sortComponentsByName)
    this.wComponents.sort(this.sortComponentsByName)
  }
  public onDeregisterConfirmation(): void {
    this.displayDeregisterConfirmation = false
    /*
    let itemCount = this.deregisterItems.length
    let successCounter = 0
    let errorCounter = 0
    for (let c of this.deregisterItems) {
      this.wProductApi
        .deleteProductById({
          id: this.workspace?.id!,
          productId: p.id!
        })
        .subscribe({
          next: () => {
            successCounter++
            const psc = this.psComponents.filter((psc) => psc.name === c.name)[0]
            psc.bucket = 'SOURCE'
            if (itemCount === successCounter + errorCounter)
              this.displayRegisterMessages('DEREGISTRATION', successCounter, errorCounter)
          },
          error: (err) => {
            errorCounter++
            // Revert change: remove item in source + add item in target list
            this.psComponents = this.psComponents.filter((psc) => psc.name !== c.name)
            this.wComponents.push(c)
            console.error(err)
            if (itemCount === successCounter + errorCounter)
              this.displayRegisterMessages('DEREGISTRATION', successCounter, errorCounter)
          }
        })
    } */
  }

  private displayRegisterMessages(type: string, success: number, error: number) {
    this.deregisterItems = []
    this.psComponents.sort(this.sortComponentsByName)
    this.wComponents.sort(this.sortComponentsByName)
    if (success > 0) {
      if (success === 1) this.msgService.success({ summaryKey: 'DIALOG.SLOT.MESSAGES.' + type + '_OK' })
      else this.msgService.success({ summaryKey: 'DIALOG.SLOT.MESSAGES.' + type + 'S_OK' })
    }
    if (error > 0)
      if (error === 1) this.msgService.error({ summaryKey: 'DIALOG.SLOT.MESSAGES.' + type + '_NOK' })
      else this.msgService.error({ summaryKey: 'DIALOG.SLOT.MESSAGES.' + type + 'S_NOK' })
  }

  public onMoveToTarget(ev: any): void {}

  /**
   * Add a Slot Component
   */
  public onSaveSlot(): void {
    console.log('onSaveSlot')
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
