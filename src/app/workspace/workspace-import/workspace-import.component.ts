import { Component, OnInit, ViewChild, Input, Output, EventEmitter, OnChanges } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { MenuItem } from 'primeng/api'
import { TranslateService } from '@ngx-translate/core'

import { PortalMessageService, UserService } from '@onecx/portal-integration-angular'

import { PreviewComponent } from 'src/app/workspace/workspace-import/preview/preview.component'
import { ConfirmComponent } from 'src/app/workspace/workspace-import/confirm/confirm.component'
import { ImportResponseStatus, WorkspaceAPIService, WorkspaceSnapshot } from 'src/app/shared/generated'

export type ImportResponse = { workspace: ImportResponseStatus; menu: ImportResponseStatus }

@Component({
  selector: 'app-workspace-import',
  templateUrl: './workspace-import.component.html',
  styleUrls: ['./workspace-import.component.scss']
})
export class WorkspaceImportComponent implements OnInit, OnChanges {
  @Input() resetDialog = true // provoke the onChange
  @Output() toggleImportDialogEvent = new EventEmitter<boolean>()
  @ViewChild(PreviewComponent) public previewComponent?: PreviewComponent
  @ViewChild(ConfirmComponent) public confirmComponent?: ConfirmComponent

  public themeCheckboxEnabled = false
  public isFormValid = true
  public steps: MenuItem[] = []
  public activeIndex = 0
  public isLoading = false
  public workspaceName = ''
  public workspaceNameOrg = ''
  public themeName = ''
  public baseUrl = ''
  public baseUrlOrg: string | undefined = undefined // the original
  public importRequestDTO?: WorkspaceSnapshot
  public activeThemeCheckboxInFirstStep = true
  public hasPermission = false
  public importResponse: ImportResponse | undefined = undefined

  constructor(
    private readonly user: UserService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly translate: TranslateService,
    private readonly workspaceApi: WorkspaceAPIService,
    private msgService: PortalMessageService
  ) {
    this.hasPermission = this.user.hasPermission('WORKSPACE#IMPORT')

    this.steps = [
      { label: this.translate.instant('WORKSPACE_IMPORT.CHOOSE_FILE') },
      { label: this.translate.instant('WORKSPACE_IMPORT.PREVIEW') },
      { label: this.translate.instant('WORKSPACE_IMPORT.CONFIRMATION') }
    ]
    this.reset()
  }

  public ngOnInit(): void {
    this.reset()
  }
  public ngOnChanges(): void {
    this.reset()
  }
  public onClose(): void {
    this.toggleImportDialogEvent.emit(true)
  }

  public reset(): void {
    this.workspaceName = ''
    this.themeName = ''
    this.baseUrl = ''
    this.baseUrlOrg = ''
    this.workspaceNameOrg = ''
    this.isFormValid = true
    this.importRequestDTO = undefined
    this.activeIndex = 0
    this.importResponse = undefined
  }

  // triggered by PREVIEW => NEXT button enabled?
  public handleFormValidation(valid: boolean): void {
    this.isFormValid = valid
  }
  // triggered by CONFIRM => IMPORT button enabled?
  public handleIsLoading(load: boolean): void {
    this.isLoading = load
  }

  // IMPORT
  public importWorkspace(): void {
    if (!this.importRequestDTO) {
      this.msgService.error({ summaryKey: 'WORKSPACE_IMPORT.WORKSPACE_IMPORT_ERROR' })
      return
    }
    this.isLoading = true
    let wKeys: string[] = []
    if (this.importRequestDTO.workspaces) {
      wKeys = Object.keys(this.importRequestDTO.workspaces) //
    }
    console.log('key', wKeys)
    console.log('key[0]', wKeys[0])
    //key[0] = this.workspaceName
    // Basic properties
    if (this.importRequestDTO.workspaces) {
      this.importRequestDTO.workspaces[wKeys[0]].name = this.workspaceName
      this.importRequestDTO.workspaces[wKeys[0]].theme = this.themeName
      this.importRequestDTO.workspaces[wKeys[0]].baseUrl = this.baseUrl
    }
    console.log('request dto: ', this.importRequestDTO)
    this.workspaceApi
      .importWorkspaces({
        workspaceSnapshot: this.importRequestDTO
      })
      .subscribe({
        next: (response) => {
          this.isLoading = false
          console.log('response dto: ', response)
          /* read data and prepare feedback 
          {
            "workspaces": { "<name>": UPDATED | CREATED | SKIPPED | ERROR },
            "menus":      { "<name>": UPDATED | CREATED | SKIPPED | ERROR }
          } */
          if (response.workspaces && response.menus) {
            let keys
            this.importResponse = JSON.parse('{"workspace":"ERROR", "menu":"ERROR"}')
            if (this.importResponse && response.workspaces) {
              keys = Object.keys(response.workspaces)
              this.importResponse.workspace = response.workspaces[keys[0]]
            }
            if (this.importResponse && response.menus) {
              keys = Object.keys(response.menus)
              this.importResponse.menu = response.menus[keys[0]]
            }
          }
          console.log('importResponse', this.importResponse)
          const messageKey = 'WORKSPACE_IMPORT.RESPONSE.' + this.importResponse?.workspace
          if (this.importResponse?.workspace === ImportResponseStatus.Error) {
            this.msgService.error({ summaryKey: messageKey })
          }
          if (['CREATED', 'UPDATED'].includes(this.importResponse?.workspace ?? 'ERROR')) {
            this.importResponse = undefined
            this.msgService.success({ summaryKey: messageKey })
            if (this.importRequestDTO?.workspaces) {
              //  this.router.navigate(['./', this.importRequestDTO.workspaces[key[0]].name], { relativeTo: this.route })
            }
          }
        },
        error: () => {
          this.isLoading = false
          this.msgService.error({ summaryKey: 'WORKSPACE_IMPORT.IMPORT_NOK' })
        }
      })
  }

  // NAVIGATE import step : NEXT
  public next(importRequestDTO?: WorkspaceSnapshot): void {
    if (this.activeIndex == 0 && importRequestDTO && importRequestDTO.workspaces) {
      this.importRequestDTO = importRequestDTO
      let keys: string[] = []
      if (this.importRequestDTO?.workspaces) {
        keys = Object.keys(this.importRequestDTO.workspaces)
      }
      this.workspaceNameOrg = importRequestDTO.workspaces[keys[0]].name ?? ''
      this.themeName = importRequestDTO.workspaces[keys[0]].theme ?? ''
      this.baseUrlOrg = importRequestDTO.workspaces[keys[0]].baseUrl
    } else if (this.activeIndex == 1) {
      this.workspaceName = this.previewComponent?.workspaceName ?? ''
      this.themeName = this.previewComponent?.themeName ?? ''
      this.baseUrl = this.previewComponent?.baseUrl ?? ''
    }
    this.activeIndex++
  }

  // NAVIGATE import step : BACK
  public back(): void {
    let key: string[] = []
    if (this.importRequestDTO?.workspaces) {
      key = Object.keys(this.importRequestDTO.workspaces)
    }
    if (this.activeIndex == 2) {
      if (this.activeIndex == 2 && this.importRequestDTO && this.importRequestDTO.workspaces) {
        this.importRequestDTO.workspaces[key[0]].name = this.confirmComponent?.workspaceName ?? ''
        this.importRequestDTO.workspaces[key[0]].baseUrl = this.confirmComponent?.baseUrl ?? ''
        this.importRequestDTO.workspaces[key[0]].theme = this.confirmComponent?.themeName ?? ''
      }
    }
    this.activeIndex--
  }
}
