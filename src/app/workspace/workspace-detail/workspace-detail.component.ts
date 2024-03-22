import { Component, OnInit, ViewChild } from '@angular/core'
import { DatePipe, Location } from '@angular/common'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import FileSaver from 'file-saver'
import { Observable, map } from 'rxjs'

import { Action, ObjectDetailItem, PortalMessageService, UserService } from '@onecx/portal-integration-angular'
import { WorkspaceSnapshot, Workspace, WorkspaceAPIService, ImagesInternalAPIService } from 'src/app/shared/generated'

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
  public headerImageUrl?: string
  public importThemeCheckbox = false
  public isLoading = false
  public selectedTabIndex = 0
  public dateFormat = 'medium'
  public objectDetails: ObjectDetailItem[] = []
  public workspace: Workspace | undefined
  public workspaceForRoles: Workspace | undefined
  public workspaceName = this.route.snapshot.params['name']
  public workspaceDeleteMessage = ''
  public workspaceDeleteVisible = false
  public workspaceDownloadVisible = false

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

  public onTabChange($event: any) {
    this.selectedTabIndex = $event.index
    if (this.selectedTabIndex === 3) this.workspaceForRoles = this.workspace
    this.prepareActionButtons()
  }

  private async getWorkspace() {
    this.workspaceApi
      .getWorkspaceByName({ workspaceName: this.workspaceName })
      .pipe()
      .subscribe({
        next: (data) => {
          if (data.resource) {
            this.workspace = data.resource
            this.prepareDialog()
          }
        },
        error: () => {
          // TODO: stay on the page and display an error message
          this.msgService.error({ summaryKey: 'ACTIONS.SEARCH.ERROR', detailKey: 'DIALOG.WORKSPACE.NOT_FOUND' })
          this.onClose() // if workspace was not found then go back
        }
      })
  }

  public prepareDialog() {
    this.preparePageHeaderImage()
    this.prepareActionButtons()
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
      })
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
    this.workspaceDownloadVisible = false
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

  public onClose(): void {
    this.location.back()
  }

  public onExportWorkspace() {
    if (!this.workspace) {
      this.workspaceNotFoundError()
      return
    }
    this.workspaceApi
      .exportWorkspaces({
        exportWorkspacesRequest: { includeMenus: true, names: [this.workspace.name] }
      })
      .subscribe({
        next: (snapshot) => {
          this.saveWorkspaceToFile(snapshot)
        },
        error: () => {}
      })

    if (this.importThemeCheckbox) {
      if (!this.workspace.theme) {
        this.themeNotSpecifiedError()
        return
      }
    }
    this.workspaceDownloadVisible = false
  }

  private saveWorkspaceToFile(workspaceExport: WorkspaceSnapshot) {
    const workspaceJson = JSON.stringify(workspaceExport, null, 2)
    FileSaver.saveAs(new Blob([workspaceJson], { type: 'text/json' }), `${this.workspace?.name ?? 'Workspace'}.json`)
  }

  private workspaceNotFoundError() {
    this.msgService.error({ summaryKey: 'DIALOG.WORKSPACE.NOT_FOUND' })
  }

  private themeNotSpecifiedError() {
    this.msgService.error({ summaryKey: 'WORKSPACE_EXPORT.THEME_NOT_SPECIFIED_MESSAGE' })
  }

  private preparePageHeaderImage() {
    if (this.workspace?.logoUrl == null || this.workspace?.logoUrl == '') {
      this.headerImageUrl = this.imageApi.configuration.basePath + '/images/' + this.workspace?.name + '/logo'
    } else {
      this.headerImageUrl = this.workspace?.logoUrl
    }
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
