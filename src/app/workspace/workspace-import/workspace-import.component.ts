import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { MenuItem } from 'primeng/api'

import { ButtonModule } from 'primeng/button'
import { DialogModule } from 'primeng/dialog'
import { StepsModule } from 'primeng/steps'
import { TooltipModule } from 'primeng/tooltip'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'
import {
  EximWorkspaceMenuItem,
  ImportResponseStatus,
  ImportWorkspaceResponse,
  Product,
  Workspace,
  WorkspaceAPIService
} from 'src/app/shared/generated'

import { ChooseFileComponent } from './choose-file/choose-file.component'
import { ConfirmComponent } from './confirm/confirm.component'
import { PreviewComponent } from './preview/preview.component'

export type ImportRequest = { workspaces?: Record<string, ImportWorkspace | undefined>; menu?: MenuItem[] }
export type ImportResponse = { workspace: ImportResponseStatus; menu?: ImportResponseStatus }
export type ImportWorkspace = Workspace & {
  themeObject?: Theme
  menuItems?: EximWorkspaceMenuItem[]
  roles?: { name?: string }[]
  products?: Product[]
}
export type Theme = {
  name?: string
  displayName?: string
  logoUrl?: string
  faviconUrl?: string
}

@Component({
  selector: 'app-workspace-import',
  standalone: true,
  imports: [
    TranslateModule,
    ButtonModule,
    DialogModule,
    StepsModule,
    TooltipModule,
    ChooseFileComponent,
    ConfirmComponent,
    PreviewComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workspace-import.component.html',
  styleUrls: ['./workspace-import.component.scss']
})
export class WorkspaceImportComponent implements OnInit, OnChanges {
  @Input() displayDialog = false
  @Input() resetDialog = true // provoke the onChange
  @Output() toggleImportDialogEvent = new EventEmitter<boolean>()

  public themeCheckboxEnabled = false
  public isFormValid = true
  public steps: MenuItem[] = []
  public activeIndex = 0
  public isLoading = false
  public importWorkspaceOrg: ImportWorkspace | undefined // imported, not changed
  public importWorkspace: ImportWorkspace | undefined // imported with user changes
  public importRequestDTO: ImportRequest = {}
  public activeThemeCheckboxInFirstStep = true
  public hasPermission = false
  public importResponse: ImportResponse | undefined = undefined

  constructor(
    private readonly user: UserService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly translate: TranslateService,
    private readonly workspaceApi: WorkspaceAPIService,
    private readonly msgService: PortalMessageService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.steps = [
      { label: this.translate.instant('WORKSPACE_IMPORT.CHOOSE_FILE') },
      { label: this.translate.instant('WORKSPACE_IMPORT.PREVIEW') },
      { label: this.translate.instant('WORKSPACE_IMPORT.CONFIRMATION') }
    ]
    this.reset()
  }

  public async ngOnInit(): Promise<void> {
    try {
      this.hasPermission = await this.user.hasPermission('WORKSPACE#IMPORT')
    } catch (err) {
      console.error(err)
    }
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
    this.isFormValid = true
    this.importRequestDTO = {}
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
  public next(importRequestDTO?: ImportRequest): void {
    // read file content
    if (this.activeIndex === 0 && importRequestDTO?.workspaces) {
      this.importRequestDTO = importRequestDTO
      let keys: string[] = []
      if (this.importRequestDTO?.workspaces) {
        keys = Object.keys(this.importRequestDTO.workspaces) as string[]
        if (keys.length > 0) {
          const wks = keys[0]
          this.importWorkspace = this.importRequestDTO.workspaces[wks] as ImportWorkspace
          this.importWorkspace.name = keys[0]
          if (this.importWorkspace.theme)
            this.importWorkspace.themeObject = {
              name: this.importWorkspace.theme,
              displayName: this.importWorkspace.theme
            }
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
  private importResponseParse(response: ImportWorkspaceResponse): ImportResponse {
    // only the first workspace and menu result is considered; no usable workspace result means failed
    const resp: ImportResponse = {
      workspace: Object.values(response.workspaces ?? {})[0] ?? ImportResponseStatus.Error
    }
    const menu = Object.values(response.menus ?? {})[0]
    if (menu) resp.menu = menu
    return resp
  }

  public saveWorkspace(): void {
    if (!this.importWorkspace) {
      this.msgService.error({ summaryKey: 'WORKSPACE_IMPORT.VALIDATION.WORKSPACE.MISSING' })
      return
    }
    const keys: string[] = Object.keys(this.importRequestDTO?.workspaces ?? {})
    // prepare import request
    if (this.importRequestDTO?.workspaces && this.importWorkspaceOrg && keys.length > 0) {
      this.isLoading = true
      //this.importRequestDTO.created = undefined
      this.importRequestDTO.workspaces[this.importWorkspace.name] = this.importWorkspace // add new
      if (this.importWorkspace.name !== this.importWorkspaceOrg.name)
        this.importRequestDTO.workspaces[this.importWorkspaceOrg.name] = undefined // remove old
      // import
      this.workspaceApi.importWorkspaces({ body: this.importRequestDTO }).subscribe({
        next: (response) => {
          this.manageWorkspaceImportResult(this.importResponseParse(response), this.importWorkspace?.name)
          this.isLoading = false
          this.cdr.markForCheck()
        },
        error: (err) => {
          this.msgService.error({ summaryKey: 'WORKSPACE_IMPORT.IMPORT_NOK' })
          console.error('importWorkspaces', err)
          this.isLoading = false
          this.cdr.markForCheck()
        }
      })
    }
  }

  private manageWorkspaceImportResult(resp: ImportResponse, wName?: string) {
    this.importResponse = undefined
    // here the import state is in:
    // resp.workspace => ERROR, CREATED, UPDATED, SKIPPED
    const messageKey = 'WORKSPACE_IMPORT.RESPONSE.' + resp.workspace
    switch (resp.workspace) {
      // on error
      case ImportResponseStatus.Error:
        this.importResponse = resp
        this.msgService.error({ summaryKey: messageKey })
        break
      // on success
      case ImportResponseStatus.Created:
      case ImportResponseStatus.Updated:
        this.msgService.success({ summaryKey: messageKey })
        if (resp.menu === ImportResponseStatus.Error)
          this.msgService.error({ summaryKey: 'WORKSPACE_IMPORT.RESPONSE.MENU_ERROR' })
        this.router.navigate(['./', wName], { relativeTo: this.route })
        break
      case ImportResponseStatus.Skipped:
        this.importResponse = resp
        this.msgService.warning({ summaryKey: messageKey })
        break
    }
  }
}
