import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  SimpleChanges,
  OnChanges,
  OnInit,
  inject,
  signal,
  DestroyRef
} from '@angular/core'
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop'
import { TranslateService } from '@ngx-translate/core'
import { BehaviorSubject, Observable, catchError, map, of } from 'rxjs'

import { SelectItem } from 'primeng/api'
import { CardModule } from 'primeng/card'

import {
  ColumnType,
  DataSortDirection,
  DataTableColumn,
  AngularAcceleratorModule,
  RowListGridData
} from '@onecx/angular-accelerator'
import { SLOT_SERVICE, SlotService } from '@onecx/angular-remote-components'
import { PortalMessageService, UserService, WorkspaceService } from '@onecx/angular-integration-interface'

import { Workspace, WorkspaceRole, WorkspaceRolesAPIService } from 'src/app/shared/generated'
import { Utils } from 'src/app/shared/utils'
import { SharedModule } from 'src/app/shared/shared.module'
import { OcxChipComponent } from 'src/app/shared/components/ocx-chip/ocx-chip.component'
import { WorkspaceRoleDetailComponent } from '../../workspace-role-detail/workspace-role-detail.component'

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
  standalone: true,
  imports: [SharedModule, AngularAcceleratorModule, CardModule, OcxChipComponent, WorkspaceRoleDetailComponent],
  providers: [{ provide: SLOT_SERVICE, useExisting: SlotService }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workspace-roles.component.html',
  styleUrls: ['./workspace-roles.component.scss']
})
export class WorkspaceRolesComponent implements OnInit, OnChanges {
  private readonly destroyRef = inject(DestroyRef)
  private readonly workspaceService = inject(WorkspaceService)
  private readonly user = inject(UserService)
  private readonly slotService = inject(SlotService)
  private readonly wRoleApi = inject(WorkspaceRolesAPIService)
  private readonly translate = inject(TranslateService)
  private readonly msgService = inject(PortalMessageService)

  @Input() workspace!: Workspace | undefined

  // data
  private readonly dataSubject$ = new BehaviorSubject<RowListGridData[]>([])
  public data$: Observable<RowListGridData[]> = this.dataSubject$.asObservable()
  public readonly data = toSignal(this.data$, { initialValue: [] as RowListGridData[] })
  public readonly filteredData = signal<RowListGridData[] | undefined>(undefined)

  // data: the receiving of workspace and iam roles are complete decoupled (no combineLatest possible)
  public wRoles$!: Observable<WorkspaceRole[]>
  public wRoles: WorkspaceRole[] = []
  public iamRoles: IAMRole[] = []
  public role: Role | undefined // for detail

  // filter
  public globalFilterValue = ''
  public quickFilterValue: RoleFilterType = 'ALL'
  public quickFilterOptions$: Observable<SelectItem[]> | undefined
  public quickFilterCount = ''
  // sort
  public sortColumns = this.prepareSortColumns()
  public sortDirection: DataSortDirection = DataSortDirection.ASCENDING
  public sortField = 'displayName'

  // dialog
  public readonly exceptionKey = signal<string | undefined>(undefined)
  public wsLoading = signal(false)
  public wRolesLoaded = signal(false)
  public iamRolesLoaded = signal(false)
  public iamAvailable = signal(false)
  public changeMode: ChangeMode = 'VIEW'
  public Utils = Utils
  public permissionEndpointExist = false
  public hasCreatePermission = false
  public hasDeletePermission = false
  public hasEditPermission = false
  public showRoleDetailDialog = false
  public showRoleDeleteDialog = false

  // manage slot to get roles from iam
  public loadingIamRoles = signal(false)
  public isComponentDefined = false
  public refreshIamRoles = false // any change here triggers getting data from IAM
  public slotName = 'onecx-iam-user-roles'
  public roleListEmitter = new EventEmitter<IAMRole[]>()
  public componentPermissions: string[] = []

  public ngOnInit(): void {
    Promise.all([
      this.user.hasPermission('WORKSPACE_ROLE#EDIT'),
      this.user.hasPermission('WORKSPACE_ROLE#CREATE'),
      this.user.hasPermission('WORKSPACE_ROLE#DELETE')
    ])
      .then(([permEdit, permCreate, permDelete]) => {
        this.hasEditPermission = permEdit
        this.hasCreatePermission = permCreate
        this.hasDeletePermission = permDelete
      })
      .catch((err) => console.error(err))
    this.prepareQuickFilter()
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
      if (this.loadingIamRoles()) {
        this.loadingIamRoles.set(false)
      }
    }, 5000)
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
        this.loadingIamRoles.set(true)
        if (this.isComponentDefined) this.prepareRoleListEmitter()
      })
    }
  }
  // Hommage to SonarCloud: separate this
  private prepareRoleListEmitter() {
    // receive data from remote component
    this.roleListEmitter.subscribe((list) => {
      this.iamRolesLoaded.set(true)
      this.loadingIamRoles.set(false)
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
          this.exceptionKey.set('EXCEPTIONS.HTTP_STATUS_' + Utils.mapping_error_status(err.status) + '.WS_ROLES')
          console.error('searchWorkspaceRoles', err)
          return of([])
        }),
        takeUntilDestroyed(this.destroyRef)
      )
  }

  // get workspace roles and fill (clean) into target array
  private getWorkspaceRoles(): void {
    this.wsLoading.set(true)
    this.exceptionKey.set(undefined)
    this.wRoles$.subscribe({
      next: (wr) => {
        this.wRoles = wr
        this.combineRoles()
      },
      complete: () => {
        this.wsLoading.set(false)
        this.wRolesLoaded.set(true)
      }
    })
  }

  // This is done each time the role data arrives the component.
  private combineRoles() {
    const combinedRoles: Role[] = [] // trigger UI refresh
    for (const r of this.wRoles)
      combinedRoles.push({ ...r, isIamRole: false, isWorkspaceRole: true, origin: ['WORKSPACE'] })
    for (const r of this.iamRoles) {
      // mark existing workspace roles as IAM role
      const wRole = combinedRoles.find((wr) => wr.name === r.name) // get role if exists on workspace
      if (wRole) {
        wRole.isIamRole = true
        wRole.origin.push('IAM')
      } else combinedRoles.push({ ...r, isIamRole: true, isWorkspaceRole: false, origin: ['IAM'] })
    }
    const sortByRoleName = function (a: Role, b: Role): number {
      return (a.name?.toUpperCase() ?? '').localeCompare(b.name?.toUpperCase() ?? '')
    }
    combinedRoles.sort(sortByRoleName)
    this.dataSubject$.next(combinedRoles as unknown as RowListGridData[])
    // reestablish filter result on reload
    if (this.quickFilterValue !== 'ALL') {
      this.onQuickFilterChange(this.quickFilterValue)
    }
  }

  private searchRoles(force: boolean = false): void {
    if (['WORKSPACE', 'ALL'].includes(this.quickFilterValue) && (force || !this.wRolesLoaded())) {
      this.getWorkspaceRoles()
    }
    if (['IAM', 'ALL'].includes(this.quickFilterValue) && (force || !this.iamRolesLoaded())) {
      this.initSlot()
    }
  }

  public convertToRoles(rows: RowListGridData[]): Role[] {
    return rows.map(
      (row) =>
        ({
          id: row.id,
          name: row['name'],
          description: row['description'],
          isIamRole: row['isIamRole'] ?? false,
          isWorkspaceRole: row['isWorkspaceRole'] ?? false,
          origin: row['origin'] ?? []
        }) as Role
    )
  }

  // reset local data stores and filter and trigger iam role refresh
  public onReload() {
    this.wRolesLoaded.set(false)
    this.iamRolesLoaded.set(false)
    this.refreshIamRoles = !this.refreshIamRoles // trigger iam role refresh
    this.loadingIamRoles.set(true)
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
        }
      })
      .subscribe({
        next: (newRole) => {
          this.msgService.success({ summaryKey: 'ACTIONS.CREATE.ROLE_OK' })
          role.id = newRole.id
          role.modificationCount = newRole.modificationCount
          role.modificationDate = newRole.modificationDate
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
   * FILTERING
   */
  public onQuickFilterChange(val: RoleFilterType): void {
    if (val === 'ALL') {
      this.filteredData.set(undefined)
    } else {
      this.filteredData.set(this.data().filter((s) => this.convertToRoleType(s['origin'])?.includes(val)))
    }
    this.quickFilterValue = val
  }

  private convertToRoleType(origin: unknown): RoleType[] {
    if (!origin) return []
    if (Array.isArray(origin)) return origin as RoleType[]
    return []
  }

  public onGetQuickFilterCount(roleType: RoleFilterType): string {
    switch (roleType) {
      case 'IAM':
        return this.iamRoles.length.toString()
      case 'WORKSPACE':
        return this.wRoles.length.toString()
      default:
        return (this.iamRoles.length + this.wRoles.length).toString()
    }
  }

  /**
   * FILTER & SORT Events
   */
  public onGlobalFilter(val?: string): void {
    if (!this.data()) return
    this.globalFilterValue = val ?? ''
    if (this.globalFilterValue === '') this.filteredData.set(undefined)
    else {
      this.filteredData.set(
        this.data().filter(
          (row) =>
            row['name']?.toString().toLowerCase().includes(this.globalFilterValue.toLowerCase()) ||
            row['type']?.toString().toLowerCase().includes(this.globalFilterValue.toLowerCase())
        )
      )
    }
  }

  public onClearGlobalFilter(): void {
    this.globalFilterValue = ''
    this.filteredData.set(undefined)
  }

  /**
   * DIALOG preparation and handling
   */
  public prepareQuickFilter(): void {
    this.quickFilterOptions$ = this.translate
      .get(['DIALOG.ROLE.QUICK_FILTER.ALL', 'DIALOG.ROLE.QUICK_FILTER.IAM', 'DIALOG.ROLE.QUICK_FILTER.WORKSPACE'])
      .pipe(
        map((qfd) => {
          return [
            { label: qfd['DIALOG.ROLE.QUICK_FILTER.ALL'], value: 'ALL' },
            { label: qfd['DIALOG.ROLE.QUICK_FILTER.IAM'], value: 'IAM' },
            { label: qfd['DIALOG.ROLE.QUICK_FILTER.WORKSPACE'], value: 'WORKSPACE' }
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

  private prepareSortColumns(): DataTableColumn[] {
    return [
      {
        columnType: ColumnType.STRING,
        nameKey: 'ROLE.NAME',
        id: 'name',
        sortable: true
      }
    ]
  }
}
