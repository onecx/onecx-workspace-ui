import { Component, EventEmitter, Input, Output } from '@angular/core'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { MenuItemAPIService, WorkspaceMenuItem } from 'src/app/shared/generated'
import { SharedModule } from 'src/app/shared/shared.module'

@Component({
  selector: 'app-menu-delete',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './menu-delete.component.html',
  styleUrls: ['./menu-delete.component.scss']
})
export class MenuDeleteComponent {
  @Input() public menuItemOrg: WorkspaceMenuItem | undefined
  @Input() public displayDialog = false
  @Output() public displayDialogChange = new EventEmitter<boolean>()
  @Output() public dataChanged = new EventEmitter<boolean>()

  constructor(
    private readonly menuApi: MenuItemAPIService,
    private readonly msgService: PortalMessageService
  ) {}

  /**
   * CLOSE
   */
  public onCloseDialog(): void {
    this.dataChanged.emit(false)
  }

  /**
   * DELETE
   */
  public onMenuDelete(): void {
    this.displayDialog = false
    this.menuApi.deleteMenuItemById({ menuItemId: this.menuItemOrg?.id ?? '' }).subscribe({
      next: () => {
        this.msgService.success({ summaryKey: 'ACTIONS.DELETE.MENU.MESSAGE.OK' })
        this.dataChanged.emit(true)
      },
      error: (err) => {
        this.msgService.error({ summaryKey: 'ACTIONS.DELETE.MENU.MESSAGE.NOK' })
        console.error('deleteMenuItemById', err)
      }
    })
  }
}
