import { Component, OnInit, ViewChild, Input, Output, EventEmitter, OnChanges } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { MenuItem } from 'primeng/api'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'
import { ImportResponseStatus, Workspace, WorkspaceAPIService } from 'src/app/shared/generated'

import { PreviewComponent } from './preview/preview.component'
import { ConfirmComponent } from './confirm/confirm.component'

export type ImportResponse = { workspace: ImportResponseStatus; menu: ImportResponseStatus }
export type ImportWorkspace = Workspace & { themeObject: Theme; menuItems: any; roles: any; products: any }
export type Theme = {
  name?: string
  displayName?: string
  logoUrl?: string
  faviconUrl?: string
}

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
  // original, read by import
  public importWorkspaceOrg: ImportWorkspace | undefined // imported with user changes
  public importWorkspace: ImportWorkspace | undefined // current state

  public workspaceNameOrg: string | undefined = undefined
  public displayNameOrg: string | undefined = undefined
  public themeNameOrg: string | undefined = undefined
  public baseUrlOrg: string | undefined = undefined // the original
  //
  // public workspaceName: string | undefined
  // public displayName: string | undefined
  // public themeName: string | undefined
  // public baseUrl: string | undefined
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
    this.importWorkspace = undefined
    this.importWorkspaceOrg = undefined
    this.baseUrlOrg = undefined
    this.workspaceNameOrg = undefined
    this.displayNameOrg = undefined
    this.themeNameOrg = undefined
    //
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

  // NAVIGATE import step : NEXT
  public next(importRequestDTO?: any): void {
    if (this.activeIndex === 0 && importRequestDTO?.workspaces) {
      this.importRequestDTO = importRequestDTO
      let keys: string[] = []
      if (this.importRequestDTO?.workspaces) {
        keys = Object.keys(this.importRequestDTO.workspaces)
        if (keys.length > 0) {
          this.importWorkspace = this.importRequestDTO.workspaces[keys[0]] as ImportWorkspace
          this.importWorkspace.name = keys[0]
          this.importWorkspace.themeObject = {
            name: this.importWorkspace.theme,
            displayName: this.importWorkspace.theme
          } as Theme
          this.importWorkspaceOrg = { ...this.importWorkspace } // clone
        }
      }
    }
    this.activeIndex++
  }

  // NAVIGATE import step : BACK
  public back(): void {
    this.activeIndex--
  }

  /**
   * IMPORT
   */
  private importResponseParse(response: any) {
    if (response.workspaces && response.menus) {
      let keys
      // default: both failed ... but get real state on respone
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
  private importResponseResult(wName: string) {
    const messageKey = 'WORKSPACE_IMPORT.RESPONSE.' + this.importResponse?.workspace
    // on error
    switch (this.importResponse?.workspace) {
      case ImportResponseStatus.Error:
        this.msgService.error({ summaryKey: messageKey })
        break
      // on success
      case ImportResponseStatus.Created:
      case ImportResponseStatus.Updated:
        this.importResponse = undefined
        this.msgService.success({ summaryKey: messageKey })
        this.router.navigate(['./', wName], { relativeTo: this.route })
        break
      case ImportResponseStatus.Skipped:
        this.msgService.warning({ summaryKey: messageKey })
        break
    }
  }

  public saveWorkspace(): void {
    if (!this.importWorkspace) {
      this.msgService.error({ summaryKey: 'WORKSPACE_IMPORT.VALIDATION.WORKSPACE.MISSING' })
      return
    }
    this.isLoading = true
    const keys: string[] = Object.keys(this.importRequestDTO.workspaces)
    if (this.importWorkspaceOrg && this.importWorkspace && keys.length > 0) {
      this.importRequestDTO.created = undefined
      this.importRequestDTO.workspaces[this.importWorkspace.name] = this.importWorkspace // add new
      if (this.importWorkspace.name !== this.importWorkspaceOrg.name)
        this.importRequestDTO.workspaces[this.importWorkspaceOrg.name] = undefined // remove old
      this.workspaceApi.importWorkspaces({ body: this.importRequestDTO }).subscribe({
        next: (response) => {
          this.isLoading = false
          this.importResponseParse(response)
          if (this.importWorkspace) this.importResponseResult(this.importWorkspace.name)
        },
        error: (err) => {
          this.isLoading = false
          this.msgService.error({ summaryKey: 'WORKSPACE_IMPORT.IMPORT_NOK' })
          console.error('importWorkspaces', err)
        }
      })
    }
  }
}
