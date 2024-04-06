import { Component, Input, SimpleChanges, OnChanges, OnInit, ViewChild } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { Observable, catchError, finalize, map, of } from 'rxjs'
import { SelectItem } from 'primeng/api'
import { DataView } from 'primeng/dataview'

import { DataViewControlTranslations } from '@onecx/portal-integration-angular'
import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'

import {
  Workspace,
  WorkspaceRole,
  WorkspaceRolesAPIService,
  RoleAPIService,
  CreateWorkspaceRoleRequest,
  IAMRolePageResult
} from 'src/app/shared/generated'
import { limitText } from 'src/app/shared/utils'

export type RoleType = 'WORKSPACE' | 'IAM'
export type RoleFilterType = 'ALL' | RoleType
export type Role = WorkspaceRole & { isIamRole: boolean; isWorkspaceRole: boolean; type: RoleType }
export type ChangeMode = 'VIEW' | 'CREATE' | 'EDIT' | 'COPY' | 'DELETE'

@Component({
  selector: 'app-workspace-roles',
  templateUrl: './workspace-roles.component.html',
  styleUrls: ['./workspace-roles.component.scss']
})
export class WorkspaceRolesComponent implements OnInit, OnChanges {
  @Input() workspace!: Workspace | undefined

  public wRoles$!: Observable<IAMRolePageResult>
  public iamRoles$!: Observable<IAMRolePageResult>
  public roles$!: Observable<Role[]>
  public roles!: Role[]
  public role!: Role | undefined
  public workspaceRoles!: string[]
  public limitText = limitText

  // dialog
  @ViewChild(DataView) dv: DataView | undefined
  public dataViewControlsTranslations: DataViewControlTranslations = {}
  public filterValue: string | undefined
  public filterValueDefault = 'name,type'
  public filterBy = this.filterValueDefault
  public sortField = 'type'
  public sortOrder = -1
  public loading = false
  public iamRolesLoaded = false
  public workspaceRolesLoaded = false
  public exceptionKey: string | undefined
  public quickFilterValue: RoleFilterType = 'WORKSPACE'
  public quickFilterItems: SelectItem[]
  public changeMode: ChangeMode = 'VIEW'
  public hasCreatePermission = false
  public hasDeletePermission = false
  public hasEditPermission = false
  public showRoleDetailDialog = false
  public showRoleDeleteDialog = false

  constructor(
    private user: UserService,
    private iamRoleApi: RoleAPIService,
    private wRoleApi: WorkspaceRolesAPIService,
    private translate: TranslateService,
    private msgService: PortalMessageService
  ) {
    this.hasEditPermission = this.user.hasPermission('WORKSPACE_ROLE#EDIT')
    this.hasCreatePermission = this.user.hasPermission('WORKSPACE_ROLE#CREATE')
    this.hasDeletePermission = this.user.hasPermission('WORKSPACE_ROLE#DELETE')
    // quick filter
    this.quickFilterItems = [
      { label: 'DIALOG.ROLE.QUICK_FILTER.ALL', value: 'ALL' },
      { label: 'DIALOG.ROLE.QUICK_FILTER.IAM', value: 'IAM' },
      { label: 'DIALOG.ROLE.QUICK_FILTER.WORKSPACE', value: 'WORKSPACE' }
    ]
  }

  ngOnInit() {
    this.prepareTranslations()
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (this.workspace && changes['workspace']) this.searchRoles()
  }

  /**
   * SEARCH
   */
  private searchWorkspaceRoles(): Observable<Role[]> {
    return this.wRoleApi
      .searchWorkspaceRoles({ workspaceRoleSearchCriteria: { workspaceId: this.workspace?.id } })
      .pipe(
        map((result) => {
          return result.stream
            ? result.stream?.map((role) => {
                return { ...role, isIamRole: false, isWorkspaceRole: true, type: 'WORKSPACE' } as Role
              })
            : []
        }),
        catchError((err) => {
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ROLES'
          console.error('searchAvailableRoles():', err)
          return of([])
        }),
        finalize(() => (this.loading = false))
      )
  }
  private searchIamRoles(): Observable<Role[]> {
    return this.iamRoleApi.searchAvailableRoles({ iAMRoleSearchCriteria: {} }).pipe(
      map((result) => {
        return result.stream
          ? result.stream?.map((role) => {
              return { ...role, isIamRole: true, isWorkspaceRole: false, type: 'IAM' } as Role
            })
          : []
      }),
      catchError((err) => {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ROLES'
        console.error('searchAvailableRoles():', err)
        return of([])
      }),
      finalize(() => (this.loading = false))
    )
  }

  private searchRoles(force: boolean = false): void {
    if (['WORKSPACE', 'ALL'].includes(this.quickFilterValue) && (force || !this.workspaceRolesLoaded)) {
      this.loading = true
      this.exceptionKey = undefined
      const result: Role[] = []
      this.searchWorkspaceRoles().subscribe({
        next: (data) => data.forEach((r) => result.push(r)),
        error: () => {},
        complete: () => {
          this.workspaceRolesLoaded = true
          this.roles = [...result]
          this.workspaceRoles = this.roles.map((r) => r.name ?? '')
        }
      })
    }
    if (['IAM', 'ALL'].includes(this.quickFilterValue) && (force || !this.iamRolesLoaded)) {
      this.loading = true
      this.exceptionKey = undefined
      const result: Role[] = []
      this.searchIamRoles().subscribe({
        next: (data) => data.forEach((r) => result.push(r)),
        error: () => {},
        complete: () => {
          this.iamRolesLoaded = true
          // combine role results and prevent duplicates
          result.forEach((iam) => {
            if (iam.name && !this.workspaceRoles.includes(iam.name)) this.roles.push(iam)
            else {
              const role = this.roles.filter((r) => r.name === iam.name)
              role[0].isIamRole = true
            }
          })
          this.roles = [...this.roles]
        }
      })
    }
  }

  public onReload() {
    this.roles = []
    this.workspaceRolesLoaded = false
    this.iamRolesLoaded = false
    this.searchRoles()
  }

  /**
   * Create/Delete Roles direct on click
   */
  public onToggleRole(role: any): void {
    if (!this.hasEditPermission) return
    if (!role.isWorkspaceRole) {
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
            role.isWorkspaceRole = true
          },
          error: () => {
            this.msgService.success({ summaryKey: 'ACTIONS.CREATE.ROLE_NOK' })
          }
        })
    }
    if (role.isWorkspaceRole) {
      this.wRoleApi.deleteWorkspaceRole({ id: role.id }).subscribe({
        next: () => {
          this.msgService.success({ summaryKey: 'ACTIONS.DELETE.ROLE_OK' })
          role.id = undefined
          role.isWorkspaceRole = false
        },
        error: () => {
          this.msgService.success({ summaryKey: 'ACTIONS.DELETE.ROLE_NOK' })
        }
      })
    }
  }

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
          role.isWorkspaceRole = true
        },
        error: () => {
          this.msgService.success({ summaryKey: 'ACTIONS.CREATE.ROLE_NOK' })
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
  public onRoleChanged(changed: boolean) {
    this.role = undefined
    this.changeMode = 'VIEW'
    this.showRoleDetailDialog = false
    this.showRoleDeleteDialog = false
    if (changed) this.searchRoles(true)
  }

  /**
   * Dialog preparation
   */
  private prepareTranslations(): void {
    this.translate
      .get(['ROLE.NAME', 'ROLE.TYPE', 'ACTIONS.SEARCH.SORT_BY', 'ACTIONS.SEARCH.FILTER', 'ACTIONS.SEARCH.FILTER_OF'])
      .pipe(
        map((data) => {
          this.dataViewControlsTranslations = {
            sortDropdownTooltip: data['ACTIONS.SEARCH.SORT_BY'],
            sortDropdownPlaceholder: data['ACTIONS.SEARCH.SORT_BY'],
            filterInputPlaceholder: data['ACTIONS.SEARCH.FILTER'],
            filterInputTooltip: data['ACTIONS.SEARCH.FILTER_OF'] + data['ROLE.NAME'] + ', ' + data['ROLE.TYPE']
          }
        })
      )
      .subscribe()
  }

  /**
   * UI Events
   */
  public onQuickFilterChange(ev: any): void {
    if (ev.value === 'ALL') {
      this.filterBy = this.filterValueDefault
      this.filterValue = ''
      this.dv?.filter(this.filterValue, 'contains')
    } else {
      this.filterBy = 'type'
      if (ev.value) {
        this.filterValue = ev.value
        this.dv?.filter(ev.value, 'equals')
      }
    }
  }
  public onFilterChange(filter: string): void {
    if (filter === '') {
      this.filterBy = 'name,type'
    }
    this.dv?.filter(filter, 'contains')
    this.searchRoles()
  }
  public onSortChange(field: string): void {
    this.sortField = field
  }
  public onSortDirChange(asc: boolean): void {
    this.sortOrder = asc ? -1 : 1
  }
}
