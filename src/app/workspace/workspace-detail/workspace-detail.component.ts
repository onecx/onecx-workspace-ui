import { Component, OnInit, ViewChild } from '@angular/core'
import { DatePipe, Location } from '@angular/common'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import FileSaver from 'file-saver'
import { Observable, map } from 'rxjs'

import { Action, ObjectDetailItem, PortalMessageService, UserService } from '@onecx/portal-integration-angular'
import { WorkspaceSnapshot, Workspace, WorkspaceAPIService } from '../../shared/generated'
import { environment } from '../../../environments/environment'

import { WorkspacePropsComponent } from './workspace-props/workspace-props.component'
import { WorkspaceRolesComponent } from './workspace-roles/workspace-roles.component'
import { WorkspaceInternComponent } from './workspace-intern/workspace-intern.component'
import { WorkspaceContactComponent } from './workspace-contact/workspace-contact.component'

@Component({
  selector: 'app-workspace-detail',
  templateUrl: './workspace-detail.component.html',
  styleUrls: ['./workspace-detail.component.scss']
})
export class WorkspaceDetailComponent implements OnInit {
  @ViewChild(WorkspacePropsComponent, { static: false })
  workspacePropsComponent!: WorkspacePropsComponent

  @ViewChild(WorkspaceContactComponent, { static: false })
  workspaceContactComponent!: WorkspaceContactComponent

  @ViewChild(WorkspaceRolesComponent, { static: false })
  workspaceRolesComponent!: WorkspaceRolesComponent

  @ViewChild(WorkspaceInternComponent, { static: false })
  workspaceInternComponent!: WorkspaceInternComponent

  private apiPrefix = environment.apiPrefix
  public actions$: Observable<Action[]> | undefined
  editMode = false
  headerImageUrl?: string
  importThemeCheckbox = false
  isLoading = false
  objectDetails: ObjectDetailItem[] = []
  workspaceDeleteMessage = ''
  workspaceDeleteVisible = false
  workspaceDetail?: Workspace
  workspaceDownloadVisible = false
  workspaceId: string = ''
  workspaceName = this.route.snapshot.params['name']
  selectedTabIndex = 0
  dateFormat = 'medium'

  constructor(
    private user: UserService,
    public route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private workspaceApi: WorkspaceAPIService,
    private translate: TranslateService,
    private msgService: PortalMessageService
  ) {
    this.dateFormat = this.user.lang$.getValue() === 'de' ? 'dd.MM.yyyy HH:mm' : 'medium'
  }

  ngOnInit() {
    this.getWorkspaceData()
  }

  public onTabChange($event: any) {
    this.selectedTabIndex = $event.index
    this.prepareActionButtons()
  }

  public onWorkspaceData(workspace: Workspace) {
    this.workspaceDetail = workspace
    this.preparePageHeaderImage()
    this.prepareActionButtons()
    this.translate
      .get(['PORTAL.ITEM.HOME_PAGE', 'PORTAL.ITEM.BASE_URL', 'PORTAL.ITEM.THEME', 'DETAIL.CREATION_DATE'])
      .subscribe((data) => {
        this.preparePageObjectDetails(data)
      })
  }

  private prepareActionButtons(): void {
    this.actions$ = this.translate
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
      .pipe(
        map((data) => {
          return [
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
              permission: 'MENU#VIEW',
              conditional: true,
              showCondition: this.workspaceDetail != null && !this.editMode
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
              actionCallback: () => this.updateWorkspace(),
              icon: 'pi pi-save',
              show: 'always',
              permission: 'WORKSPACE#SAVE',
              conditional: true,
              showCondition: this.editMode
            },
            {
              label: data['ACTIONS.EXPORT.LABEL'],
              title: data['ACTIONS.EXPORT.PORTAL'],
              actionCallback: () => (this.workspaceDownloadVisible = true),
              icon: 'pi pi-download',
              show: 'always',
              permission: 'WORKSPACE#EXPORT',
              conditional: true,
              showCondition: this.workspaceDetail != null && !this.editMode
            },
            {
              label: data['ACTIONS.EDIT.LABEL'],
              title: data['ACTIONS.EDIT.TOOLTIP'],
              actionCallback: () => this.toggleEditMode(),
              icon: 'pi pi-pencil',
              show: 'always',
              permission: 'WORKSPACE#EDIT',
              conditional: true,
              showCondition: this.workspaceDetail != null && !this.editMode && this.selectedTabIndex < 2
            },
            {
              label: data['ACTIONS.DELETE.LABEL'],
              title: data['ACTIONS.DELETE.TOOLTIP'].replace('{{TYPE}}', 'Workspace'),
              actionCallback: () => {
                this.workspaceDeleteVisible = true
                this.workspaceDeleteMessage = data['ACTIONS.DELETE.MESSAGE'].replace(
                  '{{ITEM}}',
                  this.workspaceDetail?.name
                )
              },
              icon: 'pi pi-trash',
              show: 'asOverflow',
              permission: 'WORKSPACE#DELETE',
              conditional: true,
              showCondition: this.workspaceDetail != null && !this.editMode
            }
          ]
        })
      )
  }

  private async getWorkspaceData() {
    this.workspaceApi
      .getWorkspaceByName({ workspaceName: this.workspaceName })
      .pipe()
      .subscribe({
        next: (workspace) => {
          if (workspace.resource) {
            this.workspaceId = workspace.resource.id || ''
            this.onWorkspaceData(workspace.resource)
          }
        },
        error: () => {
          this.msgService.error({ summaryKey: 'SEARCH.ERROR', detailKey: 'PORTAL.NOT_EXIST_MESSAGE' })
          close() // if workspace not found then go back
        }
      })
  }

  private updateWorkspace() {
    // Trigger update on the form of the currently selected tab
    switch (this.selectedTabIndex) {
      case 0: {
        this.workspacePropsComponent.onSubmit()
        break
      }
      case 1: {
        this.workspaceContactComponent.onSubmit()
        break
      }
      case 4: {
        this.workspaceRolesComponent.onSubmit()
        break
      }
      default: {
        console.error("Couldn't assign tab to component")
        break
      }
    }
    this.toggleEditMode('view')
    // look at form from children, then update only here
    /* this.workspaceApi.updateWorkspace
    // success
      this.getWorkspaceData() */
  }

  confirmDeleteWorkspace() {
    this.deleteWorkspace()
    this.workspaceDownloadVisible = false
  }

  private deleteWorkspace() {
    this.workspaceApi.deleteWorkspace({ id: this.workspaceId }).subscribe(
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
    this.prepareActionButtons()
  }

  public onExportWorkspace() {
    if (!this.workspaceDetail) {
      this.workspaceNotFoundError()
      return
    }

    this.workspaceApi
      .exportWorkspaces({
        exportWorkspacesRequest: { includeMenus: true, names: [this.workspaceDetail.name] }
      })
      .subscribe({
        next: (snapshot) => {
          this.saveWorkspaceToFile(snapshot)
        },
        error: () => {}
      })

    if (this.importThemeCheckbox) {
      if (this.workspaceDetail.theme) {
        /* const theme$ = this.themeApi.getThemeById({ id: this.workspaceDetail.themeId })
        finalMenuStructure$$ = theme$.pipe(
          concatMap((theme) => {
            const themeImportData = filterObject(theme, [
              'creationDate',
              'creationUser',
              'modificationDate',
              'modificationUser',
              'id',
              'workspaceId',
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
    // this.saveWorkspaceToFile(portalExport)
    this.workspaceDownloadVisible = false
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
              'workspaceId',
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
  //   FileSaver.saveAs(new Blob([themeJSON], { type: 'text/json' }), `${this.workspaceDetail?.themeName + '_Theme'}.json`)
  // }

  private saveWorkspaceToFile(workspaceExport: WorkspaceSnapshot) {
    const workspaceJson = JSON.stringify(workspaceExport, null, 2)
    FileSaver.saveAs(
      new Blob([workspaceJson], { type: 'text/json' }),
      `${this.workspaceDetail?.name || 'Workspace'}.json`
    )
  }

  private workspaceNotFoundError() {
    this.msgService.error({ summaryKey: 'DETAIL.PORTAL_NOT_FOUND' })
  }

  private themeNotSpecifiedError() {
    this.msgService.error({ summaryKey: 'DETAIL.THEME_NOT_SPECIFIED_MESSAGE' })
  }

  private preparePageObjectDetails(data: any) {
    this.objectDetails = [
      {
        label: data['PORTAL.ITEM.HOME_PAGE'],
        value: this.workspaceDetail?.homePage
      },
      {
        label: data['PORTAL.ITEM.BASE_URL'],
        value: this.workspaceDetail?.baseUrl
      },
      {
        label: data['PORTAL.ITEM.THEME'],
        value: this.workspaceDetail?.theme
      },
      {
        label: data['DETAIL.CREATION_DATE'],
        value: this.workspaceDetail?.creationDate,
        valuePipe: DatePipe,
        valuePipeArgs: this.dateFormat
      }
    ]
  }

  private preparePageHeaderImage() {
    if (this.workspaceDetail?.logoUrl && !this.workspaceDetail.logoUrl.match(/^(http|https)/g)) {
      this.headerImageUrl = this.apiPrefix + this.workspaceDetail.logoUrl
    } else {
      this.headerImageUrl = this.workspaceDetail?.logoUrl
    }
  }

  public manageMenu(): void {
    this.router.navigate(['./menu'], { relativeTo: this.route })
  }
}
