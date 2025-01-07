import { Component, OnInit, ViewChild, Input, Output, EventEmitter, OnChanges } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { MenuItem } from 'primeng/api'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'
import { ImportResponseStatus, WorkspaceAPIService } from 'src/app/shared/generated'

import { PreviewComponent } from './preview/preview.component'
import { ConfirmComponent } from './confirm/confirm.component'

export type ImportResponse = { workspace: ImportResponseStatus; menu: ImportResponseStatus }

@Component({
  selector: 'app-workspace-import',
  templateUrl: './workspace-import.component.html',
  styleUrls: ['./workspace-import.component.scss']
})
export class WorkspaceImportComponent implements OnInit, OnChanges {
  @Input() displayDialog = false
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
  public displayName = ''
  public displayNameOrg = ''
  public themeName = ''
  public baseUrl = ''
  public baseUrlOrg: string | undefined = undefined // the original
  public importRequestDTO?: any
  public activeThemeCheckboxInFirstStep = true
  public hasPermission = false
  public importResponse: ImportResponse | undefined = undefined

  constructor(
    private readonly user: UserService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly translate: TranslateService,
    private readonly workspaceApi: WorkspaceAPIService,
    private readonly msgService: PortalMessageService
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
    this.displayNameOrg = ''
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

  /**
   * IMPORT
   */
  private importParseAndExtract(response: any) {
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
  }
  private importCheckAndRoute(wKeys: string[]) {
    const messageKey = 'WORKSPACE_IMPORT.RESPONSE.' + this.importResponse?.workspace
    if (this.importResponse?.workspace === ImportResponseStatus.Error) {
      this.msgService.error({ summaryKey: messageKey })
    }
    if (['CREATED', 'UPDATED'].includes(this.importResponse?.workspace ?? 'ERROR')) {
      this.importResponse = undefined
      this.msgService.success({ summaryKey: messageKey })
      if (this.importRequestDTO?.workspaces) {
        this.router.navigate(['./', this.importRequestDTO.workspaces[wKeys[0]].name], { relativeTo: this.route })
      }
    }
  }

  public importWorkspace(): void {
    if (!this.importRequestDTO?.workspaces) {
      this.msgService.error({ summaryKey: 'WORKSPACE_IMPORT.IMPORT_ERROR' })
      return
    }
    this.isLoading = true
    const wKeys: string[] = Object.keys(this.importRequestDTO.workspaces)
    this.importRequestDTO.workspaces[wKeys[0]].name = this.workspaceName
    this.importRequestDTO.workspaces[wKeys[0]].displayName = this.workspaceName
    this.importRequestDTO.workspaces[wKeys[0]].theme = this.themeName
    this.importRequestDTO.workspaces[wKeys[0]].baseUrl = this.baseUrl
    this.workspaceApi
      .importWorkspaces({
        body: this.importRequestDTO
      })
      .subscribe({
        next: (response) => {
          this.isLoading = false
          // read data and prepare feedback: UPDATED | CREATED | SKIPPED | ERROR
          this.importParseAndExtract(response)
          this.importCheckAndRoute(wKeys)
        },
        error: (err) => {
          this.isLoading = false
          this.msgService.error({ summaryKey: 'WORKSPACE_IMPORT.IMPORT_NOK' })
          console.error('importWorkspaces', err)
        }
      })
  }

  // NAVIGATE import step : NEXT
  public next(importRequestDTO?: any): void {
    if (this.activeIndex === 0 && importRequestDTO?.workspaces) {
      this.importRequestDTO = importRequestDTO
      let keys: string[] = []
      if (this.importRequestDTO?.workspaces) {
        keys = Object.keys(this.importRequestDTO.workspaces)
      }
      this.workspaceNameOrg = importRequestDTO.workspaces[keys[0]].name ?? ''
      this.displayNameOrg = importRequestDTO.workspaces[keys[0]].displayName ?? ''
      this.themeName = importRequestDTO.workspaces[keys[0]].theme ?? ''
      this.baseUrlOrg = importRequestDTO.workspaces[keys[0]].baseUrl
    } else if (this.activeIndex === 1) {
      this.workspaceName = this.previewComponent?.workspaceName ?? ''
      this.displayName = this.previewComponent?.displayName ?? ''
      this.themeName = this.previewComponent?.themeName ?? ''
      this.baseUrl = this.previewComponent?.baseUrl ?? ''
    }
    this.activeIndex++
  }

  // NAVIGATE import step : BACK
  public back(): void {
    if (this.importRequestDTO?.workspaces) {
      const key: string[] = Object.keys(this.importRequestDTO.workspaces)
      if (this.activeIndex === 2 && this.importRequestDTO?.workspaces) {
        this.importRequestDTO.workspaces[key[0]].name = this.confirmComponent?.workspaceName ?? ''
        this.importRequestDTO.workspaces[key[0]].displayName = this.confirmComponent?.displayName ?? ''
        this.importRequestDTO.workspaces[key[0]].baseUrl = this.confirmComponent?.baseUrl ?? ''
        this.importRequestDTO.workspaces[key[0]].theme = this.confirmComponent?.themeName ?? ''
      }
    }
    this.activeIndex--
  }
}
