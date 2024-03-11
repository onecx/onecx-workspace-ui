import { Component, Input, SimpleChanges, OnChanges, OnInit, ViewChild } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { Observable, catchError, finalize, map, of } from 'rxjs'
import { SelectItem } from 'primeng/api'
import { DataView } from 'primeng/dataview'

import { PortalMessageService, DataViewControlTranslations } from '@onecx/portal-integration-angular'

import {
  Workspace,
  WorkspaceRolesAPIService,
  RoleAPIService,
  IAMRole,
  IAMRolePageResult
} from 'src/app/shared/generated'
import { limitText, sortByLocale } from 'src/app/shared/utils'

export type RoleType = 'WORKSPACE' | 'IAM'
export type RoleFilterType = 'ALL' | RoleType
export type Role = IAMRole & { isIamRole: boolean; isWorkspaceRole: boolean; deleted: boolean; type: RoleType }

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
  public workspaceRoles!: string[]
  public limitText = limitText
  private sortByLocale = sortByLocale

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

  addDisplay = false
  newWorkspaceRole = ''

  constructor(
    private iamRoleApi: RoleAPIService,
    private wRoleApi: WorkspaceRolesAPIService,
    private translate: TranslateService,
    private msgService: PortalMessageService
  ) {
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
  private declareWorkspaceRolesObservable(): void {
    this.wRoles$ = this.wRoleApi.searchWorkspaceRoles({ workspaceRoleSearchCriteria: {} }).pipe(
      catchError((err) => {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ROLES'
        console.error('searchAvailableRoles():', err)
        return of({} as IAMRolePageResult)
      }),
      finalize(() => (this.loading = false))
    )
  }
  private searchWorkspaceRoles(): Observable<Role[]> {
    console.log('searchWorkspaceRoles')
    this.declareWorkspaceRolesObservable()
    return this.wRoles$.pipe(
      map((result) => {
        return result.stream
          ? result.stream?.map((role) => {
              return { ...role, isIamRole: false, isWorkspaceRole: true, type: 'WORKSPACE' } as Role
            })
          : []
      })
    )
  }
  private declareIamObservable(): void {
    this.iamRoles$ = this.iamRoleApi.searchAvailableRoles({ iAMRoleSearchCriteria: {} }).pipe(
      catchError((err) => {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ROLES'
        console.error('searchAvailableRoles():', err)
        return of({} as IAMRolePageResult)
      }),
      finalize(() => (this.loading = false))
    )
  }
  private searchIamRoles(): Observable<Role[]> {
    console.log('searchIamRoles')
    this.declareIamObservable()
    return this.iamRoles$.pipe(
      map((result) => {
        return result.stream
          ? result.stream?.map((role) => {
              return { ...role, isIamRole: true, isWorkspaceRole: false, type: 'IAM' } as Role
            })
          : []
      })
    )
  }

  private searchRoles(): void {
    if (['WORKSPACE', 'ALL'].includes(this.quickFilterValue) && !this.workspaceRolesLoaded) {
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
    if (['IAM', 'ALL'].includes(this.quickFilterValue) && !this.iamRolesLoaded) {
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
   * Triggered by detail component
   *   => extract list of role names to be assigned to the workspace
   */
  public onSubmit(): void {
    let roles: Role[] = this.roles.filter((r) => r.isWorkspaceRole === true && !r.deleted)
    if (roles.length > 0) {
      const wroles: string[] = []
      roles.forEach((r) => {
        if (r.name) wroles.push(r.name)
      })
      //if (this.workspace?.workspaceRoles) this.workspace.workspaceRoles = wroles
    }
  }

  public onToggleRole(role: any): void {
    if (role.isIamRole) role.isWorkspaceRole = !role.isWorkspaceRole
    else if (this.workspaceRoles?.includes(role.name)) role.deleted = !role.deleted
  }

  public onSave() {
    console.log('onSave()')
  }

  /**
   * Dialog preparation
   */
  private prepareTranslations(): void {
    this.translate
      .get([
        'PRODUCT.NAME',
        'ACTIONS.SEARCH.SORT_BY',
        'ACTIONS.SEARCH.FILTER',
        'ACTIONS.SEARCH.FILTER_OF',
        'ACTIONS.SEARCH.SORT_DIRECTION_ASC',
        'ACTIONS.SEARCH.SORT_DIRECTION_DESC'
      ])
      .pipe(
        map((data) => {
          this.dataViewControlsTranslations = {
            sortDropdownPlaceholder: data['ACTIONS.SEARCH.SORT_BY'],
            filterInputPlaceholder: data['ACTIONS.SEARCH.FILTER'],
            filterInputTooltip: data['ACTIONS.SEARCH.FILTER.OF'] + data['PRODUCT.NAME'],
            sortOrderTooltips: {
              ascending: data['ACTIONS.SEARCH.SORT_DIRECTION_ASC'],
              descending: data['ACTIONS.SEARCH.SORT_DIRECTION_DESC']
            },
            sortDropdownTooltip: data['ACTIONS.SEARCH.SORT_BY']
          }
        })
      )
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
