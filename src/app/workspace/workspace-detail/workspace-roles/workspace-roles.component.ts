import {
  APP_INITIALIZER,
  Component,
  EventEmitter,
  Input,
  SimpleChanges,
  OnChanges,
  OnInit,
  OnDestroy
} from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { Observable, Subject, catchError, finalize, map, of } from 'rxjs'
import { SelectItem } from 'primeng/api'
import { DataView } from 'primeng/dataview'

import { DataViewControlTranslations } from '@onecx/portal-integration-angular'
import { SLOT_SERVICE, SlotService } from '@onecx/angular-remote-components'
import { PortalMessageService, UserService, WorkspaceService } from '@onecx/angular-integration-interface'

import {
  Workspace,
  WorkspaceRole,
  WorkspaceRolesAPIService,
  CreateWorkspaceRoleRequest
} from 'src/app/shared/generated'
import { Utils } from 'src/app/shared/utils'

export type IAMRole = { name?: string; description?: string }
export type RoleType = 'WORKSPACE' | 'IAM'
export type RoleFilterType = 'ALL' | RoleType
export type Role = WorkspaceRole & { isIamRole: boolean; isWorkspaceRole: boolean; origin: RoleType[] }
export type ChangeMode = 'VIEW' | 'CREATE' | 'EDIT' | 'COPY' | 'DELETE'

export function slotInitializer(slotService: SlotService) {
  return () => slotService.init()
}

@Component({
  selector: 'app-workspace-roles',
  templateUrl: './workspace-roles.component.html',
  styleUrls: ['./workspace-roles.component.scss'],
  providers: [
    { provide: APP_INITIALIZER, useFactory: slotInitializer, deps: [SLOT_SERVICE], multi: true },
    { provide: SLOT_SERVICE, useExisting: SlotService }
  ]
})
export class WorkspaceRolesComponent implements OnInit, OnChanges, OnDestroy {
  @Input() workspace!: Workspace | undefined
  // data: the receiving of workspace and iam roles are complete decoupled (no combineLatest possible)
  private readonly destroy$ = new Subject()
  public wRoles$!: Observable<WorkspaceRole[]>
  public wRoles: WorkspaceRole[] = []
  public iamRoles: IAMRole[] = []
  public roles: Role[] = []
  public rolesFiltered: Role[] = [] // filtered collection used in HTML
  public role: Role | undefined // for detail
  public Utils = Utils
  public permissionEndpointExist = false

  // dialog
  public dataViewControlsTranslations$: Observable<DataViewControlTranslations> | undefined
  public filterValue = 'WORKSPACE'
  public filterByDefault = 'name'
  public filterBy = this.filterByDefault
  public wsLoading = false
  public wRolesLoaded = false
  public iamRolesLoaded = false
  public iamAvailable = false
  public exceptionKey: string | undefined = undefined
  public quickFilterValue: RoleFilterType = 'ALL'
  public quickFilterOptions$: Observable<SelectItem[]> | undefined
  public quickFilterCount = ''
  public changeMode: ChangeMode = 'VIEW'
  public hasCreatePermission = false
  public hasDeletePermission = false
  public hasEditPermission = false
  public showRoleDetailDialog = false
  public showRoleDeleteDialog = false

  // manage slot to get roles from iam
  public loadingIamRoles = false
  public isComponentDefined = false
  public refreshIamRoles = false // any change here triggers getting data from IAM
  public slotName = 'onecx-iam-user-roles'
  public roleListEmitter = new EventEmitter<IAMRole[]>()
  public componentPermissions: string[] = []

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly user: UserService,
    private readonly slotService: SlotService,
    private readonly wRoleApi: WorkspaceRolesAPIService,
    private readonly translate: TranslateService,
    private readonly msgService: PortalMessageService
  ) {
    this.hasEditPermission = this.user.hasPermission('WORKSPACE_ROLE#EDIT')
    this.hasCreatePermission = this.user.hasPermission('WORKSPACE_ROLE#CREATE')
    this.hasDeletePermission = this.user.hasPermission('WORKSPACE_ROLE#DELETE')
    this.prepareQuickFilter()
  }

  public ngOnInit(): void {
    this.prepareTranslations()
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (this.workspace && changes['workspace']) {
      this.prepareWorkspaceRoleSearch()
      this.searchRoles()
      // check detail endpoint exists
      this.permissionEndpointExist = Utils.doesEndpointExist(
        this.workspaceService,
        'onecx-permission',
        'onecx-permission-ui',
        'workspace'
      )
    }
    // after 5s we assume IAM product is not running
    setTimeout(() => {
      if (this.loadingIamRoles) {
        this.loadingIamRoles = false
      }
    }, 5000)
  }
  public ngOnDestroy(): void {
    this.destroy$.next(undefined)
    this.destroy$.complete()
  }

  /**
   * SLOT for IAM roles
   */
  // initialize receiving data - once
  private initSlot() {
    if (!this.isComponentDefined) {
      // check if the IAM component is assigned to the slot
      this.slotService.isSomeComponentDefinedForSlot(this.slotName).subscribe((def) => {
        this.isComponentDefined = def
        this.loadingIamRoles = true
        if (this.isComponentDefined) this.prepareRoleListEmitter()
      })
    }
  }
  // Hommage to SonarCloud: separate this
  private prepareRoleListEmitter() {
    // receive data from remote component
    this.roleListEmitter.subscribe((list) => {
      this.iamRolesLoaded = true
      this.loadingIamRoles = false
      this.iamRoles = list
      this.combineRoles()
    })
  }

  /**
   * SEARCH
   */
  private prepareWorkspaceRoleSearch(): void {
    this.wRoles$ = this.wRoleApi
      .searchWorkspaceRoles({ workspaceRoleSearchCriteria: { workspaceId: this.workspace?.id, pageSize: 1000 } })
      .pipe(
        map((result) => result.stream ?? []),
        catchError((err) => {
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.WS_ROLES'
          console.error('searchWorkspaceRoles', err)
          return of([])
        }),
        finalize(() => (this.wsLoading = false))
      )
  }

  // get workspace roles and fill (clean) into target array
  private getWorkspaceRoles(): void {
    this.wsLoading = true
    this.exceptionKey = undefined
    this.wRoles$.subscribe({
      next: (data) => {
        this.wRoles = data
        this.combineRoles()
      },
      complete: () => {
        this.wsLoading = true
        this.wRolesLoaded = true
      }
    })
  }

  // This is done each time the role data arrives the component.
  private combineRoles() {
    const roles: Role[] = [] // trigger UI refresh
    for (const r of this.wRoles) roles.push({ ...r, isIamRole: false, isWorkspaceRole: true, origin: ['WORKSPACE'] })
    for (const r of this.iamRoles) {
      // mark existing workspace roles as IAM role
      const wRole = roles.find((wr) => wr.name === r.name) // get role if exists on workspace
      if (wRole) {
        wRole.isIamRole = true
        wRole.origin.push('IAM')
      } else roles.push({ ...r, isIamRole: true, isWorkspaceRole: false, origin: ['IAM'] })
    }
    const sortByRoleName = function (a: Role, b: Role): number {
      return (a.name?.toUpperCase() ?? '').localeCompare(b.name?.toUpperCase() ?? '')
    }
    roles.sort(sortByRoleName)
    this.rolesFiltered = this.roles = roles
  }

  private searchRoles(force: boolean = false): void {
    if (['WORKSPACE', 'ALL'].includes(this.quickFilterValue) && (force || !this.wRolesLoaded)) {
      this.getWorkspaceRoles()
    }
    if (['IAM', 'ALL'].includes(this.quickFilterValue) && (force || !this.iamRolesLoaded)) {
      this.initSlot()
    }
  }

  // reset local data stores and filter and trigger iam role refresh
  public onReload() {
    this.roles = []
    this.wRolesLoaded = false
    this.iamRolesLoaded = false
    this.refreshIamRoles = !this.refreshIamRoles // trigger iam role refresh
    this.loadingIamRoles = true
    this.searchRoles(true)
  }

  /**
   * UI Events: ROLE CHANGES
   */
  public onAddRole(ev: MouseEvent, role: Role): void {
    ev.stopPropagation()
    this.wRoleApi
      .createWorkspaceRole({
        createWorkspaceRoleRequest: {
          workspaceId: this.workspace?.id ?? '',
          name: role.name,
          description: role.description
        } as CreateWorkspaceRoleRequest
      })
      .subscribe({
        next: (data) => {
          this.msgService.success({ summaryKey: 'ACTIONS.CREATE.ROLE_OK' })
          role.id = data.id
          role.modificationCount = data.modificationCount
          role.modificationDate = data.modificationDate
          role.isWorkspaceRole = true
          role.origin.push('WORKSPACE')
        },
        error: (err) => {
          this.msgService.error({ summaryKey: 'ACTIONS.CREATE.ROLE_NOK' })
          console.error('createWorkspaceRole', err)
        }
      })
  }

  public onCreateRole(ev: MouseEvent): void {
    ev.stopPropagation()
    this.role = undefined
    this.changeMode = 'CREATE'
    this.showRoleDetailDialog = true
  }
  public onEditRole(ev: Event, role: Role): void {
    ev.stopPropagation()
    this.role = role
    this.changeMode = role.isWorkspaceRole && this.hasEditPermission ? 'EDIT' : 'VIEW'
    this.showRoleDetailDialog = true
  }
  public onDeleteRole(ev: Event, role: Role): void {
    ev.stopPropagation()
    if (!this.hasEditPermission) return
    this.role = role
    this.changeMode = 'DELETE'
    this.showRoleDeleteDialog = true
  }
  // dialog response handling
  public onRoleChanged(changed: boolean) {
    this.role = undefined
    this.changeMode = 'VIEW'
    this.showRoleDetailDialog = false
    this.showRoleDeleteDialog = false
    if (changed) this.searchRoles(true)
  }

  /**
   * UI Events: FILTERING
   */
  public onQuickFilterChange(ev: any): void {
    if (ev.value === 'ALL') {
      this.rolesFiltered = this.roles
    } else {
      this.rolesFiltered = this.roles.filter((s) => s.origin.includes(ev.value))
    }
    this.quickFilterValue = ev.value
  }
  public onFilterChange(filter: string, dv: DataView): void {
    this.filterBy = 'name'
    dv?.filter(filter)
  }

  public onGetQuickFilterCount(roleType: RoleFilterType): string {
    switch (roleType) {
      case 'IAM':
        return '' + this.iamRoles.length
      case 'WORKSPACE':
        return '' + this.wRoles.length
      default:
        return '' + this.roles.length
    }
  }

  /**
   * DIALOG preparation and handling
   */
  private prepareTranslations(): void {
    this.dataViewControlsTranslations$ = this.translate
      .get(['ROLE.NAME', 'DIALOG.DATAVIEW.FILTER', 'DIALOG.DATAVIEW.FILTER_OF', 'DIALOG.DATAVIEW.SORT_BY'])
      .pipe(
        map((data) => {
          return {
            filterInputPlaceholder: data['DIALOG.DATAVIEW.FILTER'],
            filterInputTooltip: data['DIALOG.DATAVIEW.FILTER_OF'] + data['ROLE.NAME'],
            sortDropdownTooltip: data['DIALOG.DATAVIEW.SORT_BY'],
            sortDropdownPlaceholder: data['DIALOG.DATAVIEW.SORT_BY']
          } as DataViewControlTranslations
        })
      )
  }

  public prepareQuickFilter(): void {
    this.quickFilterOptions$ = this.translate
      .get(['DIALOG.ROLE.QUICK_FILTER.ALL', 'DIALOG.ROLE.QUICK_FILTER.IAM', 'DIALOG.ROLE.QUICK_FILTER.WORKSPACE'])
      .pipe(
        map((data) => {
          return [
            { label: data['DIALOG.ROLE.QUICK_FILTER.ALL'], value: 'ALL' },
            { label: data['DIALOG.ROLE.QUICK_FILTER.IAM'], value: 'IAM' },
            { label: data['DIALOG.ROLE.QUICK_FILTER.WORKSPACE'], value: 'WORKSPACE' }
          ]
        })
      )
  }

  public getPermisionEndpointUrl$(name: string): Observable<string | undefined> {
    if (this.permissionEndpointExist)
      return this.workspaceService.getUrl('onecx-permission', 'onecx-permission-ui', 'workspace', {
        'workspace-name': name
      })
    return of(undefined)
  }
}
