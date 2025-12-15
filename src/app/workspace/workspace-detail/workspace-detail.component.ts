import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core'
import { Location } from '@angular/common'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { catchError, finalize, map, Observable, of } from 'rxjs'
import { Message } from 'primeng/api'

import { Action, ObjectDetailItem } from '@onecx/angular-accelerator'
import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'
import {
  GetWorkspaceResponse,
  Workspace,
  WorkspaceAPIService,
  ImagesInternalAPIService,
  RefType
} from 'src/app/shared/generated'
import { Utils } from 'src/app/shared/utils'

import { WorkspacePropsComponent } from './workspace-props/workspace-props.component'
import { WorkspaceContactComponent } from './workspace-contact/workspace-contact.component'
import { WorkspaceInternComponent } from './workspace-intern/workspace-intern.component'

@Component({
  selector: 'app-workspace-detail',
  templateUrl: './workspace-detail.component.html',
  styleUrls: ['./workspace-detail.component.scss']
})
export class WorkspaceDetailComponent implements OnInit, AfterViewInit {
  @ViewChild(WorkspacePropsComponent, { static: false }) workspacePropsComponent!: WorkspacePropsComponent
  @ViewChild(WorkspaceContactComponent, { static: false }) workspaceContactComponent!: WorkspaceContactComponent
  @ViewChild(WorkspaceInternComponent, { static: false }) workspaceInternComponent!: WorkspaceInternComponent

  public actions$: Observable<Action[]> | undefined
  public editMode = false
  public loading = false
  public exceptionKey: string | undefined = undefined
  public headerImageUrl?: string
  public selectedTabIndex = 0
  public dateFormat = 'M/d/yy, hh:mm:ss a'
  public objectDetails!: ObjectDetailItem[]
  public workspace$!: Observable<Workspace>
  public workspace: Workspace | undefined
  public workspaceForRoles: Workspace | undefined
  public workspaceForSlots: Workspace | undefined
  public workspaceForProducts: Workspace | undefined
  public workspaceName = this.route.snapshot.params['name']
  public uriFragment = this.route.snapshot.fragment // #fragment to address a certain TAB
  public workspaceDeleteVisible = false
  public workspaceExportVisible = false
  public currentLogoUrl: string | undefined = undefined
  public showOperatorMessage = true // display initially only
  public limitText = Utils.limitText
  private translations$: Observable<Message[]> | undefined
  public messages: Message[] = []

  constructor(
    public readonly route: ActivatedRoute,
    private readonly user: UserService,
    private readonly router: Router,
    private readonly location: Location,
    private readonly translate: TranslateService,
    private readonly msgService: PortalMessageService,
    private readonly workspaceApi: WorkspaceAPIService,
    private readonly imageApi: ImagesInternalAPIService,
    private readonly cd: ChangeDetectorRef
  ) {
    this.dateFormat = this.user.lang$.getValue() === 'de' ? 'dd.MM.yyyy HH:mm:ss' : 'M/d/yy, hh:mm:ss a'
  }

  ngOnInit() {
    this.prepareDialogTranslations()
    this.getWorkspace()
  }

  ngAfterViewInit() {
    this.cd.detectChanges()
  }

  // prepare Observable - trigger request in HTML with async
  public getWorkspace() {
    this.loading = true
    this.exceptionKey = undefined
    this.workspace$ = this.workspaceApi.getWorkspaceByName({ workspaceName: this.workspaceName }).pipe(
      map((data: GetWorkspaceResponse) => {
        if (data.resource) this.workspace = data.resource
        this.currentLogoUrl = this.getLogoUrl(data.resource)
        this.goToTab(data.resource)
        return data.resource ?? ({} as Workspace)
      }),
      catchError((err) => {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.WORKSPACE'
        console.error('getWorkspaceByName', err)
        return of({} as Workspace)
      }),
      finalize(() => {
        this.loading = false
        this.prepareActionButtons()
      })
    )
  }

  private onSaveWorkspace() {
    // Trigger update on the form of the currently selected tab
    let workspaceData: Workspace | undefined
    switch (this.selectedTabIndex) {
      case 0: {
        this.workspacePropsComponent.onSave()
        if (this.workspacePropsComponent.propsForm.valid) workspaceData = this.workspacePropsComponent.workspace
        else return
        break
      }
      case 1: {
        this.workspaceContactComponent.onSave()
        if (this.workspaceContactComponent.contactForm.valid) workspaceData = this.workspacePropsComponent.workspace
        else return
        workspaceData = this.workspaceContactComponent.workspace
        break
      }
      case 2: {
        this.workspaceInternComponent.onSave()
        workspaceData = this.workspaceInternComponent.workspace
        break
      }
      default: {
        console.error("Couldn't assign tab to component")
        break
      }
    }
    this.workspaceApi
      .updateWorkspace({
        id: workspaceData?.id ?? '',
        updateWorkspaceRequest: { resource: workspaceData! }
      })
      .subscribe({
        next: (data) => {
          this.msgService.success({ summaryKey: 'ACTIONS.EDIT.MESSAGE.WORKSPACE.OK' })
          this.toggleEditMode('view')
          // update observable with response data
          this.workspace$ = new Observable((sub) => sub.next(data))
        },
        error: (err) => {
          console.error('updateWorkspace', err)
          this.msgService.error({ summaryKey: 'ACTIONS.EDIT.MESSAGE.WORKSPACE.NOK' })
        }
      })
  }

  public onConfirmDeleteWorkspace(): void {
    this.workspaceDeleteVisible = false
    this.workspaceApi.deleteWorkspace({ id: this.workspace?.id ?? '' }).subscribe({
      next: () => {
        this.msgService.success({ summaryKey: 'ACTIONS.DELETE.WORKSPACE.MESSAGE.OK' })
        this.onClose()
      },
      error: (err) => {
        console.error('deleteWorkspace', err)
        this.msgService.error({ summaryKey: 'ACTIONS.DELETE.WORKSPACE.MESSAGE.NOK' })
      }
    })
  }

  /**
   * UI EVENTS
   */
  // triggered by URI
  private goToTab(workspace: Workspace | undefined) {
    if (workspace && this.uriFragment) {
      const tabMap = new Map([
        ['roles', 3],
        ['slots', 4],
        ['products', 5]
      ])
      this.onTabChange({ index: tabMap.get(this.uriFragment) }, workspace)
    }
  }
  // activate TAB
  public onTabChange($event: any, workspace: Workspace | undefined) {
    if (workspace) {
      this.showOperatorMessage = false
      this.selectedTabIndex = $event.index
      if (this.selectedTabIndex === 3) this.workspaceForRoles = workspace
      if (this.selectedTabIndex === 4) this.workspaceForSlots = workspace
      if (this.selectedTabIndex === 5) this.workspaceForProducts = workspace
    }
    this.prepareActionButtons()
  }

  // If product registration change then refresh slot TAB data
  public onProductChanges() {
    if (this.workspaceForSlots) this.workspaceForSlots = { ...this.workspace! }
  }

  public onClose(): void {
    this.location.back()
  }

  public onExportWorkspace() {
    if (this.workspace) this.workspaceExportVisible = true
    else this.msgService.error({ summaryKey: 'DIALOG.WORKSPACE.NOT_FOUND' })
  }

  private toggleEditMode(forcedMode?: 'edit' | 'view'): void {
    if (forcedMode === 'view') this.editMode = false
    else this.editMode = !this.editMode
    this.prepareActionButtons()
  }

  public getLogoUrl(workspace: Workspace | undefined): string | undefined {
    if (!workspace) return undefined
    if (workspace.logoUrl) return workspace?.logoUrl
    else return Utils.bffImageUrl(this.imageApi.configuration.basePath, workspace?.name, RefType.Logo)
  }

  // called by props component (this is the master of this url)
  public onUpdateHeaderImageUrl(url: string) {
    this.currentLogoUrl = url
  }

  public onGoToMenu(): void {
    this.router.navigate(['./menu'], { relativeTo: this.route })
  }

  public prepareActionButtons(): void {
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
        'ACTIONS.DELETE.WORKSPACE.HEADER'
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
              permission: 'WORKSPACE#SEARCH',
              conditional: true,
              showCondition: !this.editMode
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
              actionCallback: () => this.onSaveWorkspace(),
              icon: 'pi pi-save',
              show: 'always',
              permission: 'WORKSPACE#EDIT',
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
              showCondition: this.workspace != null && !this.editMode && [0, 1, 2].includes(this.selectedTabIndex)
            },
            {
              label: data['ACTIONS.DELETE.LABEL'],
              title: data['ACTIONS.DELETE.WORKSPACE.HEADER'],
              actionCallback: () => {
                this.workspaceDeleteVisible = true
              },
              icon: 'pi pi-trash',
              show: 'asOverflow',
              permission: 'WORKSPACE#DELETE',
              conditional: true,
              showCondition: !this.editMode
            }
          ]
        })
      )
  }

  private prepareDialogTranslations(): void {
    this.translations$ = this.translate.get(['INTERNAL.OPERATOR_MESSAGE', 'INTERNAL.OPERATOR_HINT']).pipe(
      map((data) => {
        return [
          {
            id: 'ws_detail_operator_message',
            severity: 'warn',
            life: 5000,
            closable: true,
            summary: data['INTERNAL.OPERATOR_HINT'],
            detail: data['INTERNAL.OPERATOR_MESSAGE']
          }
        ]
      })
    )
    this.translations$.subscribe((data) => (this.messages = data))
  }
}
