import { Component, Input, SimpleChanges, OnChanges, OnInit, ViewChild } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { Observable, catchError, finalize, map, of } from 'rxjs'
import { SelectItem } from 'primeng/api'
import { DataView } from 'primeng/dataview'

import { PortalMessageService, DataViewControlTranslations } from '@onecx/portal-integration-angular'

import { Workspace, RoleAPIService, IAMRole, IAMRolePageResult } from 'src/app/shared/generated'
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
  @Input() editMode: boolean = false

  public iam$!: Observable<IAMRolePageResult>
  public roles$!: Observable<Role[]>
  public roles!: Role[]
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
    private roleApi: RoleAPIService,
    private translate: TranslateService,
    private msgService: PortalMessageService
  ) {
    // quick filter
    this.quickFilterItems = [
      { label: 'ROLE.QUICK_FILTER.ALL', value: 'ALL' },
      { label: 'ROLE.QUICK_FILTER.IAM', value: 'IAM' },
      { label: 'ROLE.QUICK_FILTER.WORKSPACE', value: 'WORKSPACE' }
    ]
  }

  ngOnInit() {
    this.prepareTranslations()
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (this.workspace) {
      if (changes['workspace'] || (changes['editMode'] && !this.editMode && changes['editMode'].previousValue))
        this.searchRoles()
    }
  }

  /**
   * SEARCH
   */
  private declareIamObservable(): void {
    this.iam$ = this.roleApi.searchAvailableRoles({ iAMRoleSearchCriteria: {} }).pipe(
      catchError((err) => {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ROLES'
        console.error('searchAvailableRoles():', err)
        return of({} as IAMRolePageResult)
      }),
      finalize(() => (this.loading = false))
    )
  }
  private searchWorkspaceRoles(): Observable<Role[]> {
    const workspaceRoles: Role[] = []
    this.workspace?.workspaceRoles?.forEach((r: any) => {
      workspaceRoles.push({ name: r, isWorkspaceRole: true, isIamRole: false, deleted: false, type: 'WORKSPACE' })
    })
    return of(workspaceRoles)
  }
  private searchIamRoles(): Observable<Role[]> {
    this.declareIamObservable()
    return this.iam$.pipe(
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
          result.forEach((iam) => {
            if (iam.name && !this.workspace?.workspaceRoles?.includes(iam.name)) this.roles.push(iam)
            else {
              const role = this.roles.filter((r) => r.name === iam.name)
              role[0].isIamRole = true
            }
          })
          this.roles = [...this.roles]
        }
      })
    }
    /*
    this.roles$ = combineLatest([this.searchWorkspaceRoles(), this.searchIamRoles()]).pipe(
      map(([w, iam]) => w.concat(iam))
    )*/
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
      if (this.workspace?.workspaceRoles) this.workspace.workspaceRoles = wroles
    }
  }

  public onToggleRole(role: any): void {
    if (this.editMode) {
      if (role.isIamRole) role.isWorkspaceRole = !role.isWorkspaceRole
      else if (this.workspace?.workspaceRoles?.includes(role.name)) role.deleted = !role.deleted
    }
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
