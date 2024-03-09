import { Component, Input, SimpleChanges, OnChanges, OnInit, ViewChild } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { Observable, combineLatest, catchError, finalize, map, of } from 'rxjs'
import { DataView } from 'primeng/dataview'

import { PortalMessageService, DataViewControlTranslations } from '@onecx/portal-integration-angular'

import { Workspace, RoleAPIService, IAMRole, IAMRolePageResult } from 'src/app/shared/generated'
import { limitText, sortByLocale } from 'src/app/shared/utils'

export type RoleType = 'WORKSPACE' | 'IAM'
export type RoleTypeFilter = 'ALL' | RoleType
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
  public workspaceRoles!: Role[]
  public roles!: Role[]
  public limitText = limitText
  private sortByLocale = sortByLocale

  // dialog
  @ViewChild(DataView) dv: DataView | undefined
  public dataViewControlsTranslations: DataViewControlTranslations = {}
  public filterValue: string | undefined
  public filterBy = 'name'
  public sortField = 'name'
  public sortOrder = 1
  public loading = false
  public exceptionKey: string | undefined
  public quickFilterRoleType: RoleTypeFilter = 'ALL'

  addDisplay = false
  newWorkspaceRole = ''

  constructor(
    private roleApi: RoleAPIService,
    private translate: TranslateService,
    private msgService: PortalMessageService
  ) {}

  ngOnInit() {
    this.prepareTranslations()
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (this.workspace) {
      if (changes['workspace']) {
        this.searchRoles()
      }
      // restore data if edit mode was cancelled
      else if (changes['editMode'] && !this.editMode && changes['editMode'].previousValue) {
        this.searchRoles()
      }
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
    this.workspaceRoles = []
    this.workspace?.workspaceRoles?.forEach((r: any) => {
      this.workspaceRoles.push({ name: r, isWorkspaceRole: true, isIamRole: false, deleted: false, type: 'IAM' })
    })
    return of(this.workspaceRoles)
  }
  private searchIamRoles(): Observable<Role[]> {
    this.declareIamObservable()
    return this.iam$.pipe(
      map((result) => {
        return result.stream
          ? result.stream?.map((role) => {
              return { ...role, isIamRole: true, isWorkspaceRole: false } as Role
            })
          : []
      })
    )
  }

  private searchRoles(): void {
    this.loading = true
    this.exceptionKey = undefined
    switch (this.quickFilterRoleType) {
      case 'ALL':
        this.roles$ = combineLatest([this.searchWorkspaceRoles(), this.searchIamRoles()]).pipe(
          map(([w, iam]) => w.concat(iam))
        )
        break
      case 'WORKSPACE':
        this.roles$ = this.searchWorkspaceRoles()
        break
      case 'IAM':
        this.roles$ = this.searchIamRoles()
        break
    }
    this.roles = []
    this.roles$.subscribe({
      next: (data) => (this.roles = data)
    })
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
      else {
        if (this.workspace?.workspaceRoles?.includes(role.name)) role.deleted = !role.deleted
      }
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
  public onFilterChange(filter: string): void {
    console.log('onFilterChange')
    if (filter === '') {
      this.filterBy = 'name,type'
    }
    this.dv?.filter(filter, 'contains')
  }
  public onSortChange(field: string): void {
    this.sortField = field
  }
  public onSortDirChange(asc: boolean): void {
    this.sortOrder = asc ? -1 : 1
  }
}
