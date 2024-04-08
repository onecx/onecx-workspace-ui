import { Component, OnInit, ViewChild } from '@angular/core'
import { Location } from '@angular/common'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import FileSaver from 'file-saver'
import { catchError, finalize, map, Observable, of } from 'rxjs'

import { Action, ObjectDetailItem } from '@onecx/angular-accelerator'
import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'
import {
  GetWorkspaceResponse,
  WorkspaceSnapshot,
  Workspace,
  WorkspaceAPIService,
  ImagesInternalAPIService
} from 'src/app/shared/generated'

import { WorkspacePropsComponent } from './workspace-props/workspace-props.component'
import { WorkspaceContactComponent } from './workspace-contact/workspace-contact.component'

@Component({
  selector: 'app-workspace-detail',
  templateUrl: './workspace-detail.component.html',
  styleUrls: ['./workspace-detail.component.scss']
})
export class WorkspaceDetailComponent implements OnInit {
  @ViewChild(WorkspacePropsComponent, { static: false }) workspacePropsComponent!: WorkspacePropsComponent
  @ViewChild(WorkspaceContactComponent, { static: false }) workspaceContactComponent!: WorkspaceContactComponent

  public actions$: Observable<Action[]> | undefined
  public editMode = false
  public exportMenu = true
  public isLoading = false
  public exceptionKey: string | undefined = undefined
  public headerImageUrl?: string
  public selectedTabIndex = 0
  public dateFormat = 'medium'
  public objectDetails!: ObjectDetailItem[]
  public workspace$!: Observable<GetWorkspaceResponse>
  public workspace: Workspace | undefined
  public workspaceForRoles: Workspace | undefined
  public workspaceForProducts: Workspace | undefined
  public workspaceName = this.route.snapshot.params['name']
  public workspaceDeleteMessage = ''
  public workspaceDeleteVisible = false

  constructor(
    private user: UserService,
    public route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private translate: TranslateService,
    private msgService: PortalMessageService,
    private workspaceApi: WorkspaceAPIService,
    private imageApi: ImagesInternalAPIService
  ) {
    this.dateFormat = this.user.lang$.getValue() === 'de' ? 'dd.MM.yyyy HH:mm' : 'medium'
  }

  ngOnInit() {
    this.getWorkspace()
  }

  public getWorkspace() {
    this.isLoading = true
    this.workspace$ = this.workspaceApi.getWorkspaceByName({ workspaceName: this.workspaceName }).pipe(
      map((data) => {
        if (data.resource) this.workspace = data.resource
        return data
      }),
      catchError((err) => {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.WORKSPACE'
        console.error('getWorkspaceByName():', err)
        return of({} as GetWorkspaceResponse)
      }),
      finalize(() => {
        this.isLoading = false
        this.prepareDialog()
      })
    )
  }

  public prepareDialog() {
    this.prepareActionButtons()
    /* to be deleted?
    this.translate
      .get(['WORKSPACE.HOME_PAGE', 'WORKSPACE.BASE_URL', 'WORKSPACE.THEME', 'INTERNAL.CREATION_DATE'])
      .subscribe((data) => {
        this.objectDetails = [
          { label: data['WORKSPACE.HOME_PAGE'], value: this.workspace?.homePage },
          { label: data['WORKSPACE.BASE_URL'], value: this.workspace?.baseUrl },
          { label: data['WORKSPACE.THEME'], value: this.workspace?.theme },
          {
            label: data['INTERNAL.CREATION_DATE'],
            value: this.workspace?.creationDate,
            valuePipe: DatePipe,
            valuePipeArgs: this.dateFormat
          }
        ]
      }) */
  }

  private updateWorkspace() {
    // Trigger update on the form of the currently selected tab
    switch (this.selectedTabIndex) {
      case 0: {
        this.workspacePropsComponent.onSubmit()
        this.workspace = this.workspacePropsComponent.workspace
        break
      }
      case 1: {
        this.workspaceContactComponent.onSubmit()
        this.workspace = this.workspaceContactComponent.workspace
        break
      }
      default: {
        console.error("Couldn't assign tab to component")
        break
      }
    }
    this.toggleEditMode('view')
    this.workspaceApi
      .updateWorkspace({
        id: this.workspace?.id ?? '',
        updateWorkspaceRequest: { resource: this.workspace! }
      })
      .subscribe({
        next: (data) => {
          this.workspace = data
          this.msgService.success({ summaryKey: 'ACTIONS.EDIT.MESSAGE.CHANGE_OK' })
          this.prepareDialog()
        },
        error: (err) => {
          console.error('update workspace', err)
          this.msgService.error({ summaryKey: 'ACTIONS.EDIT.MESSAGE.CHANGE_NOK' })
        }
      })
  }

  public onConfirmDeleteWorkspace(): void {
    this.workspaceApi.deleteWorkspace({ id: this.workspace?.id ?? '' }).subscribe(
      () => {
        this.msgService.success({ summaryKey: 'ACTIONS.DELETE.MESSAGE_OK' })
        this.onClose()
      },
      (err) => {
        console.error('delete workspace', err)
        this.msgService.error({ summaryKey: 'ACTIONS.DELETE.MESSAGE_NOK' })
      }
    )
  }

  /**
   * UI EVENTS
   */
  public onTabChange($event: any) {
    this.selectedTabIndex = $event.index
    // if (this.selectedTabIndex === 3) this.workspaceForRoles = this.workspace
    // if (this.selectedTabIndex === 4) this.workspaceForProducts = this.workspace
    this.prepareActionButtons()
  }

  public onClose(): void {
    this.location.back()
  }

  public onExportWorkspace() {
    if (!this.workspace) {
      this.msgService.error({ summaryKey: 'DIALOG.WORKSPACE.NOT_FOUND' })
      return
    }
    this.workspaceApi
      .exportWorkspaces({
        exportWorkspacesRequest: { includeMenus: this.exportMenu, names: [this.workspace.name] }
      })
      .subscribe({
        next: (snapshot) => {
          this.saveWorkspaceToFile(snapshot)
        },
        error: () => {
          this.msgService.error({ summaryKey: 'ACTIONS.EXPORT.MESSAGE.NOK' })
        }
      })
  }

  private saveWorkspaceToFile(workspaceExport: WorkspaceSnapshot) {
    const workspaceJson = JSON.stringify(workspaceExport, null, 2)
    FileSaver.saveAs(new Blob([workspaceJson], { type: 'text/json' }), `${this.workspace?.name ?? 'Workspace'}.json`)
  }

  public getImagePath(workspace: Workspace): string {
    if (workspace?.logoUrl) return workspace?.logoUrl
    else return this.imageApi.configuration.basePath + '/images/' + workspace?.name + '/logo'
  }

  private toggleEditMode(forcedMode?: 'edit' | 'view'): void {
    if (forcedMode) this.editMode = forcedMode === 'edit' ? true : false
    else this.editMode = !this.editMode
    this.prepareActionButtons()
  }

  public onGoToMenu(): void {
    this.router.navigate(['./menu'], { relativeTo: this.route })
  }

  private prepareActionButtons(): void {
    this.actions$ = this.translate
      .get([
        'DIALOG.MENU.LABEL',
        'DIALOG.MENU.SUBHEADER',
        'ACTIONS.NAVIGATION.BACK',
        'ACTIONS.NAVIGATION.BACK.TOOLTIP',
        'ACTIONS.CANCEL',
        'ACTIONS.TOOLTIPS.CANCEL',
        'ACTIONS.SAVE',
        'ACTIONS.TOOLTIPS.SAVE',
        'ACTIONS.EXPORT.LABEL',
        'ACTIONS.EXPORT.WORKSPACE',
        'ACTIONS.EDIT.LABEL',
        'ACTIONS.EDIT.TOOLTIP',
        'ACTIONS.DELETE.LABEL',
        'ACTIONS.DELETE.WORKSPACE',
        'ACTIONS.DELETE.MESSAGE'
      ])
      .pipe(
        map((data) => {
          return [
            {
              label: data['ACTIONS.NAVIGATION.BACK'],
              title: data['ACTIONS.NAVIGATION.BACK.TOOLTIP'],
              actionCallback: () => this.onClose(),
              icon: 'pi pi-arrow-left',
              show: 'always',
              permission: 'WORKSPACE#SEARCH'
            },
            {
              label: data['DIALOG.MENU.LABEL'],
              title: data['DIALOG.MENU.SUBHEADER'],
              actionCallback: () => this.onGoToMenu(),
              icon: 'pi pi-sitemap',
              show: 'always',
              permission: 'MENU#VIEW',
              conditional: true,
              showCondition: this.workspace != null && !this.editMode
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
              title: data['ACTIONS.EXPORT.WORKSPACE'],
              actionCallback: () => this.onExportWorkspace(),
              icon: 'pi pi-download',
              show: 'always',
              permission: 'WORKSPACE#EXPORT',
              conditional: true,
              showCondition: this.workspace != null && !this.editMode
            },
            {
              label: data['ACTIONS.EDIT.LABEL'],
              title: data['ACTIONS.EDIT.TOOLTIP'],
              actionCallback: () => this.toggleEditMode(),
              icon: 'pi pi-pencil',
              show: 'always',
              permission: 'WORKSPACE#EDIT',
              conditional: true,
              showCondition: this.workspace != null && !this.editMode && [0, 1].includes(this.selectedTabIndex)
            },
            {
              label: data['ACTIONS.DELETE.LABEL'],
              title: data['ACTIONS.DELETE.WORKSPACE'],
              actionCallback: () => {
                this.workspaceDeleteVisible = true
                this.workspaceDeleteMessage = data['ACTIONS.DELETE.MESSAGE'].replace('{{ITEM}}', this.workspace?.name)
              },
              icon: 'pi pi-trash',
              show: 'asOverflow',
              permission: 'WORKSPACE#DELETE',
              conditional: true,
              showCondition: !this.editMode && this.workspace && this.workspace?.name != 'ADMIN'
            }
          ]
        })
      )
  }
}
