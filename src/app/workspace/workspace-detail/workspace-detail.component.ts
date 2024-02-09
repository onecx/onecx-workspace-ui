import { Component, Inject, OnInit, ViewChild } from '@angular/core'
import { DatePipe, Location } from '@angular/common'
import { ActivatedRoute /* , ExtraOptions */, Router } from '@angular/router'
// import { /* concatMap, */ Observable } from 'rxjs'
import { TranslateService } from '@ngx-translate/core'
import FileSaver from 'file-saver'

import {
  Action,
  AUTH_SERVICE,
  ConfigurationService,
  IAuthService,
  ObjectDetailItem,
  PortalMessageService
} from '@onecx/portal-integration-angular'
import {
  WorkspaceSnapshot,
  // ImportRequestDTOv1ThemeImportData,
  MenuItemAPIService,
  Workspace,
  WorkspaceAPIService

  // ThemeDTO,
  // ThemesAPIService
} from '../../shared/generated'
import { environment } from '../../../environments/environment'

import { WorkspacePropsComponent } from './workspace-props/workspace-props.component'
import { WorkspaceRolesComponent } from './workspace-roles/workspace-roles.component'
import { WorkspaceInternComponent } from './workspace-intern/workspace-intern.component'
import { WorkspaceImagesComponent } from './workspace-images/workspace-images.component'
import { WorkspaceContactComponent } from './workspace-contact/workspace-contact.component'

// import { filterObject, filterObjectTree } from '../../shared/utils'

@Component({
  selector: 'app-workspace-detail',
  templateUrl: './workspace-detail.component.html',
  styleUrls: ['./workspace-detail.component.scss']
})
export class WorkspaceDetailComponent implements OnInit {
  @ViewChild(WorkspacePropsComponent, { static: false })
  portalPropsComponent!: WorkspacePropsComponent

  @ViewChild(WorkspaceContactComponent, { static: false })
  portalContactComponent!: WorkspaceContactComponent

  @ViewChild(WorkspaceRolesComponent, { static: false })
  portalRolesComponent!: WorkspaceRolesComponent

  @ViewChild(WorkspaceInternComponent, { static: false })
  portalInternComponent!: WorkspaceInternComponent

  @ViewChild(WorkspaceImagesComponent, { static: false })
  portalImagesComponent!: WorkspaceImagesComponent

  private apiPrefix = environment.apiPrefix
  actions: Action[] = []
  editMode = false
  headerImageUrl?: string
  importThemeCheckbox = false
  isLoading = false
  objectDetails: ObjectDetailItem[] = []
  portalDeleteMessage = ''
  portalDeleteVisible = false
  portalDetail?: Workspace
  portalDownloadVisible = false
  portalId: string = ''
  portalName = this.route.snapshot.params['name']
  selectedIndex = 0
  dateFormat = 'medium'

  constructor(
    public route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private config: ConfigurationService,
    private menuApi: MenuItemAPIService,
    // private themeApi: ThemesAPIService,
    private workspaceApi: WorkspaceAPIService,
    private translate: TranslateService,
    private msgService: PortalMessageService,
    @Inject(AUTH_SERVICE) readonly auth: IAuthService
  ) {
    this.dateFormat = this.config.lang === 'de' ? 'dd.MM.yyyy HH:mm:ss' : 'medium'
    console.log('SNAP', this.route.snapshot.toString())
  }

  ngOnInit() {
    this.getPortalData()
  }

  public onChange($event: any) {
    this.selectedIndex = $event.index
  }

  public onPortalData(portal: Workspace) {
    this.portalDetail = portal
    this.preparePageHeaderImage()
    this.translate
      .get([
        'ACTIONS.NAVIGATION.BACK',
        'ACTIONS.NAVIGATION.BACK.TOOLTIP',
        'MENU.HEADER',
        'MENU.SUBHEADER',
        'ACTIONS.CANCEL',
        'ACTIONS.TOOLTIPS.CANCEL',
        'ACTIONS.SAVE',
        'ACTIONS.TOOLTIPS.SAVE',
        'ACTIONS.EXPORT.LABEL',
        'ACTIONS.EXPORT.PORTAL',
        'ACTIONS.EDIT.LABEL',
        'ACTIONS.EDIT.TOOLTIP',
        'ACTIONS.DELETE.LABEL',
        'ACTIONS.DELETE.TOOLTIP',
        'ACTIONS.DELETE.MESSAGE'
      ])
      .subscribe((data) => {
        this.preparePageHeaderActions(data)
      })
    this.translate
      .get(['PORTAL.ITEM.HOME_PAGE', 'PORTAL.ITEM.BASE_URL', 'PORTAL.ITEM.THEME', 'DETAIL.CREATION_DATE'])
      .subscribe((data) => {
        this.preparePageObjectDetails(data)
      })
  }

  private async getPortalData() {
    this.workspaceApi
      .getWorkspaceByName({ name: this.portalName })
      .pipe()
      .subscribe({
        next: (portal) => {
          // Convert microfrontends to Set to avoid typeerrors
          // portal.microfrontendRegistrations = new Set(Array.from(portal.microfrontendRegistrations ?? []))
          if (portal.resource) {
            this.portalId = portal.resource.id || ''
            this.onPortalData(portal.resource)
          }
        },
        error: () => {
          this.msgService.error({ summaryKey: 'SEARCH.ERROR', detailKey: 'PORTAL.NOT_EXIST_MESSAGE' })
          close() // if portal not found then go back
        }
      })
  }

  private updatePortal() {
    // Trigger update on the form of the currently selected tab
    switch (this.selectedIndex) {
      case 0: {
        this.portalPropsComponent.onSubmit()
        break
      }
      case 1: {
        this.portalContactComponent.onSubmit()
        break
      }
      case 4: {
        this.portalRolesComponent.onSubmit()
        break
      }
      case 5: {
        this.portalImagesComponent.onSubmit()
        break
      }
      default: {
        console.error("Couldn't assign tab to component")
        break
      }
    }
    this.toggleEditMode('view')
  }

  confirmDeletePortal() {
    this.deletePortal()
    this.portalDownloadVisible = false
  }

  private deletePortal() {
    this.workspaceApi.deleteWorkspace({ id: this.portalId }).subscribe(
      () => {
        this.msgService.success({ summaryKey: 'ACTIONS.DELETE.MESSAGE_OK' })
        this.close()
      },
      () => {
        this.msgService.error({ summaryKey: 'ACTIONS.DELETE.MESSAGE_NOK' /* , detailKey: err.error.message */ })
      }
    )
  }

  private close(): void {
    this.location.back()
  }

  private toggleEditMode(forcedMode?: 'edit' | 'view'): void {
    if (forcedMode) this.editMode = forcedMode === 'edit' ? true : false
    else this.editMode = !this.editMode
    this.translate
      .get([
        'ACTIONS.NAVIGATION.BACK',
        'ACTIONS.NAVIGATION.BACK.TOOLTIP',
        'MENU.HEADER',
        'MENU.SUBHEADER',
        'ACTIONS.CANCEL',
        'ACTIONS.TOOLTIPS.CANCEL',
        'ACTIONS.SAVE',
        'ACTIONS.TOOLTIPS.SAVE',
        'ACTIONS.EXPORT.LABEL',
        'ACTIONS.EXPORT.PORTAL',
        'ACTIONS.EDIT.LABEL',
        'ACTIONS.EDIT.TOOLTIP',
        'ACTIONS.DELETE.LABEL',
        'ACTIONS.DELETE.TOOLTIP',
        'ACTIONS.DELETE.MESSAGE'
      ])
      .subscribe((data) => {
        this.preparePageHeaderActions(data)
      })
  }

  public onExportWorkspace() {
    if (!this.portalDetail) {
      this.portalNotFoundError()
      return
    }

    this.workspaceApi
      .exportWorkspaces({
        exportWorkspacesRequest: { includeMenus: true, names: [this.portalDetail.name] }
      })
      .subscribe({
        next: (snapshot) => {
          this.savePortalToFile(snapshot)
        },
        error: () => {}
      })
    // get workspace object with filtered properties
    // const portalExport: WorkspaceSnapshot = {
    //   portal: filterObject(this.portalDetail, [
    //     'creationDate',
    //     'creationUser',
    //     'modificationDate',
    //     'modificationUser',
    //     'id',
    //     'themeId',
    //     'tenantId',
    //     'parentItemId'
    //   ]) as Workspace
    // }

    // const menuStructure$ = this.menuApi.getMenuStructureForWorkspaceId({ id: this.portalId })
    // let finalMenuStructure$$ = menuStructure$

    if (this.importThemeCheckbox) {
      if (this.portalDetail.theme) {
        /* const theme$ = this.themeApi.getThemeById({ id: this.portalDetail.themeId })
        finalMenuStructure$$ = theme$.pipe(
          concatMap((theme) => {
            const themeImportData = filterObject(theme, [
              'creationDate',
              'creationUser',
              'modificationDate',
              'modificationUser',
              'id',
              'portalId',
              'tenantId',
              'portals'
            ]) as ImportRequestDTOv1ThemeImportData
            portalExport.themeImportData = themeImportData
            this.saveThemeToFile(themeImportData)
            return menuStructure$
          })
        ) */
      } else {
        this.themeNotSpecifiedError()
        return
      }
    }
    // this.exportWorkspace(finalMenuStructure$$, portalExport)
    // this.savePortalToFile(portalExport)
    this.portalDownloadVisible = false
  }

  // private exportWorkspace(
  //   finalMenuStructure$$: Observable<Array<EximWorkspaceMenuItem>>,
  //   portalExport: WorkspaceSnapshot
  // ) {
  /* finalMenuStructure$$.subscribe({
      next: (structure) => {
        // get menu structure object with filtered properties
        const items = structure.map((item) =>
          filterObjectTree(
            item,
            [
              'creationDate',
              'creationUser',
              'modificationDate',
              'modificationUser',
              'id',
              'themeId',
              'parentItemId',
              'portalId',
              'tenantId'
            ],
            'children'
          )
        ) as EximWorkspaceMenuItem[]
        // sort explicitly because filtering destroys the order on first level
        if (portalExport.workspaces && portalExport.workspaces[0].menu?.menu?.menuItems) {
          portalExport.workspaces[0].menu?.menu?.menuItems = items.sort((a, b) => (a.position || 0) - (b.position || 0))
        }
        portalExport[0].synchronizePermissions = false
        
      },
      error: () => this.themeNotSpecifiedError() */
  //   })
  // }

  // private saveThemeToFile(theme: ThemeDTO) {
  //   const themeJSON = JSON.stringify(theme, null, 2)
  //   FileSaver.saveAs(new Blob([themeJSON], { type: 'text/json' }), `${this.portalDetail?.themeName + '_Theme'}.json`)
  // }

  private savePortalToFile(portalExport: WorkspaceSnapshot) {
    const portalJson = JSON.stringify(portalExport, null, 2)
    FileSaver.saveAs(new Blob([portalJson], { type: 'text/json' }), `${this.portalDetail?.name || 'Workspace'}.json`)
  }

  private portalNotFoundError() {
    this.msgService.error({ summaryKey: 'DETAIL.PORTAL_NOT_FOUND' })
  }

  private themeNotSpecifiedError() {
    this.msgService.error({ summaryKey: 'DETAIL.THEME_NOT_SPECIFIED_MESSAGE' })
  }

  private preparePageObjectDetails(data: any) {
    this.objectDetails = [
      {
        label: data['PORTAL.ITEM.HOME_PAGE'],
        value: this.portalDetail?.homePage
      },
      {
        label: data['PORTAL.ITEM.BASE_URL'],
        value: this.portalDetail?.baseUrl
      },
      {
        label: data['PORTAL.ITEM.THEME'],
        value: this.portalDetail?.theme
      },
      {
        label: data['DETAIL.CREATION_DATE'],
        value: this.portalDetail?.creationDate,
        valuePipe: DatePipe,
        valuePipeArgs: this.dateFormat
      }
    ]
  }

  private preparePageHeaderImage() {
    if (this.portalDetail?.logoUrl && !this.portalDetail.logoUrl.match(/^(http|https)/g)) {
      this.headerImageUrl = this.apiPrefix + this.portalDetail.logoUrl
    } else {
      this.headerImageUrl = this.portalDetail?.logoUrl
    }
  }

  private preparePageHeaderActions(data: any) {
    this.actions = []
    this.actions.push(
      {
        label: data['ACTIONS.NAVIGATION.BACK'],
        title: data['ACTIONS.NAVIGATION.BACK.TOOLTIP'],
        actionCallback: () => this.close(),
        icon: 'pi pi-arrow-left',
        show: 'always',
        permission: 'WORKSPACE#SEARCH'
      },
      {
        label: data['MENU.HEADER'],
        title: data['MENU.SUBHEADER'],
        actionCallback: () => this.manageMenu(),
        icon: 'pi pi-sitemap',
        show: 'always',
        permission: 'WORKSPACE_MENU#VIEW',
        conditional: true,
        showCondition: this.portalDetail != null && !this.editMode
      },
      {
        label: data['ACTIONS.CANCEL'],
        title: data['ACTIONS.TOOLTIPS.CANCEL'],
        actionCallback: () => this.toggleEditMode(),
        icon: 'pi pi-times',
        show: 'always',
        permission: 'WORKSPACE#VIEW',
        conditional: true,
        showCondition: this.editMode
      },
      {
        label: data['ACTIONS.SAVE'],
        title: data['ACTIONS.TOOLTIPS.SAVE'],
        actionCallback: () => this.updatePortal(),
        icon: 'pi pi-save',
        show: 'always',
        permission: 'WORKSPACE#SAVE',
        conditional: true,
        showCondition: this.editMode
      },
      {
        label: data['ACTIONS.EXPORT.LABEL'],
        title: data['ACTIONS.EXPORT.PORTAL'],
        actionCallback: () => (this.portalDownloadVisible = true),
        icon: 'pi pi-download',
        show: 'always',
        permission: 'WORKSPACE#EXPORT',
        conditional: true,
        showCondition: this.portalDetail != null && !this.editMode
      },
      {
        label: data['ACTIONS.EDIT.LABEL'],
        title: data['ACTIONS.EDIT.TOOLTIP'],
        actionCallback: () => this.toggleEditMode(),
        icon: 'pi pi-pencil',
        show: 'always',
        permission: 'WORKSPACE#EDIT',
        conditional: true,
        showCondition: this.portalDetail != null && !this.editMode
      },
      {
        label: data['ACTIONS.DELETE.LABEL'],
        title: data['ACTIONS.DELETE.TOOLTIP'].replace('{{TYPE}}', 'Workspace'),
        actionCallback: () => {
          this.portalDeleteVisible = true
          this.portalDeleteMessage = data['ACTIONS.DELETE.MESSAGE'].replace('{{ITEM}}', this.portalDetail?.name)
        },
        icon: 'pi pi-trash',
        show: 'asOverflow',
        permission: 'WORKSPACE#DELETE',
        conditional: true,
        showCondition: this.portalDetail != null && !this.editMode
      }
    )
  }

  public manageMenu(): void {
    this.router.navigate(['./menu'], { relativeTo: this.route })
  }
}
