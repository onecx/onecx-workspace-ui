import { Component, OnInit, ViewChild, Input, Output, EventEmitter, OnChanges } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { MenuItem } from 'primeng/api'
import { TranslateService } from '@ngx-translate/core'

import { PortalMessageService, UserService } from '@onecx/portal-integration-angular'

import { PreviewComponent } from 'src/app/workspace/workspace-import/preview/preview.component'
import { ConfirmComponent } from 'src/app/workspace/workspace-import/confirm/confirm.component'
import { WorkspaceAPIService, EximWorkspaceMenuItem, WorkspaceSnapshot } from 'src/app/shared/generated'

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

  public importThemeCheckbox = false
  public themeCheckboxEnabled = false
  public syncPermCheckbox = true
  public isFormValid = true
  public steps: MenuItem[] = []
  public activeIndex = 0
  public isLoading = false
  public workspaceName = ''
  public themeName = ''
  public baseUrl = ''
  public baseUrlOrg: string | undefined = undefined // the original
  public importRequestDTO?: WorkspaceSnapshot
  public activeThemeCheckboxInFirstStep = true
  public hasPermission = false

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
      { label: this.translate.instant('PORTAL_IMPORT.CHOOSE_FILE') },
      { label: this.translate.instant('PORTAL_IMPORT.PREVIEW') },
      { label: this.translate.instant('PORTAL_IMPORT.CONFIRMATION') }
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
    this.isFormValid = true
    this.themeCheckboxEnabled = false
    this.importThemeCheckbox = false
    this.importRequestDTO = undefined
    this.activeIndex = 0
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
      this.msgService.error({ summaryKey: 'PORTAL_IMPORT.PORTAL_IMPORT_ERROR' })
      return
    }
    this.isLoading = true
    let key: string[] = []
    if (this.importRequestDTO.workspaces) {
      key = Object.keys(this.importRequestDTO.workspaces)
    }
    // Basic properties
    if (this.importRequestDTO.workspaces) {
      this.importRequestDTO.workspaces[key[0]].name = this.workspaceName
      this.importRequestDTO.workspaces[key[0]].theme = this.themeName
      // this.importRequestDTO.synchronizePermissions = this.syncPermCheckbox
      this.importRequestDTO.workspaces[key[0]].baseUrl = this.baseUrl
    }

    // Theme
    // if (this.importRequestDTO.workspaces) {
    //   if (!this.importThemeCheckbox) {
    //     this.importRequestDTO.workspaces[key[0]].theme = undefined
    //   } else {
    //     this.importRequestDTO.workspaces[key[0]].theme = this.themeName
    //   }
    // }

    // Microfontends: convert Set to Array what the backend expects
    // the default is {} which is not a Set !
    // const mfeArray = new Array<MicrofrontendRegistrationDTOv1>()
    // if (
    //   this.importRequestDTO.portal.microfrontendRegistrations &&
    //   this.importRequestDTO.portal.microfrontendRegistrations?.values !== undefined
    // ) {
    //   this.importRequestDTO.portal.microfrontendRegistrations.forEach((mfe) => mfeArray.push(mfe))
    // }
    // this.importRequestDTO.portal.microfrontendRegistrations = mfeArray as any

    // If the baseUrl was changed then change the correspondig URLs in menu and mfes:
    if (this.baseUrlOrg && this.baseUrlOrg !== this.baseUrl) {
      // Microfrontends
      // this.importRequestDTO.portal.microfrontendRegistrations?.forEach((mfe) => {
      //   if (this.baseUrlOrg) {
      //     if (mfe.baseUrl?.startsWith(this.baseUrlOrg))
      //       mfe.baseUrl = this.baseUrl + mfe.baseUrl?.substring(this.baseUrlOrg.length)
      //   }
      // })
      // Menu items ... hierarchical
      if (this.importRequestDTO.workspaces) {
        if (this.importRequestDTO.workspaces[key[0]].menu?.menu?.menuItems) {
          this.alignMenuItemsBaseUrl(this.importRequestDTO.workspaces[key[0]].menu?.menu!.menuItems!)
        }
      }
    }
    this.workspaceApi
      .importWorkspaces({
        workspaceSnapshot: this.importRequestDTO
      })
      .subscribe({
        next: () => {
          if (this.confirmComponent?.workspaceNameExists) {
            this.msgService.success({ summaryKey: 'PORTAL_IMPORT.PORTAL_IMPORT_UPDATE_SUCCESS' })
          } else {
            this.msgService.success({ summaryKey: 'PORTAL_IMPORT.PORTAL_IMPORT_CREATE_SUCCESS' })
          }
          this.isLoading = false
          if (this.importRequestDTO?.workspaces) {
            this.router.navigate(['./', this.importRequestDTO.workspaces[key[0]].name], { relativeTo: this.route })
          }
        },
        error: () => {
          this.isLoading = false
          this.msgService.error({ summaryKey: 'PORTAL_IMPORT.PORTAL_IMPORT_ERROR' })
        }
      })
  }

  // step recursively through menu tree and align base URL
  public alignMenuItemsBaseUrl(menuItems: Array<EximWorkspaceMenuItem>): void {
    menuItems?.forEach((item) => {
      if (this.baseUrlOrg) {
        if (item.url?.startsWith(this.baseUrlOrg)) item.url = this.baseUrl + item.url?.substring(this.baseUrlOrg.length)
      }
      this.alignMenuItemsBaseUrl(item.children || [])
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
      this.themeName = importRequestDTO.workspaces[keys[0]].theme || ''
      this.baseUrlOrg = importRequestDTO.workspaces[keys[0]].baseUrl
    } else if (this.activeIndex == 1) {
      this.workspaceName = this.previewComponent?.workspaceName || ''
      this.themeName = this.previewComponent?.themeName || ''
      this.baseUrl = this.previewComponent?.baseUrl || ''
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
        this.importRequestDTO.workspaces[key[0]].name = this.confirmComponent?.workspaceName || ''
        this.importRequestDTO.workspaces[key[0]].baseUrl = this.confirmComponent?.baseUrl || ''
        this.importRequestDTO.workspaces[key[0]].theme = this.confirmComponent?.themeName || ''
      }
    }
    this.activeIndex--
  }
}
