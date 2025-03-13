import {
  APP_INITIALIZER,
  Component,
  EventEmitter,
  Input,
  SimpleChanges,
  OnChanges,
  OnInit,
  ViewChild
} from '@angular/core'
import { Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { Observable, catchError, finalize, map, of } from 'rxjs'
import { SelectItem } from 'primeng/api'
import { DataView } from 'primeng/dataview'

import { DataViewControlTranslations } from '@onecx/portal-integration-angular'
import { SLOT_SERVICE, SlotService } from '@onecx/angular-remote-components'
import { PortalMessageService, UserService, WorkspaceService } from '@onecx/angular-integration-interface'

import {
  Workspace,
  WorkspaceRole,
  WorkspaceRolesAPIService,
  RoleAPIService,
  CreateWorkspaceRoleRequest
} from 'src/app/shared/generated'
import { goToEndpoint, limitText } from 'src/app/shared/utils'

export type IAMRole = { name?: string; description?: string }
export type RoleType = 'WORKSPACE' | 'IAM' | 'WORKSPACE,IAM'
export type RoleFilterType = 'ALL' | RoleType
export type Role = WorkspaceRole & { isIamRole: boolean; isWorkspaceRole: boolean; type: RoleType }
export type ChangeMode = 'VIEW' | 'CREATE' | 'EDIT' | 'COPY' | 'DELETE'
export type ExtendedSelectItem = SelectItem & { tooltipKey?: string }

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
export class WorkspaceRolesComponent implements OnInit, OnChanges {
  @Input() workspace!: Workspace | undefined
  // data: the receiving of workspace and iam roles are complete decoupled (no combineLatest possible)
  public wRoles$!: Observable<WorkspaceRole[]>
  public wRoles: WorkspaceRole[] = []
  public iamRoles: IAMRole[] = []
  public roles: Role[] = [] // target collection used in HTML
  public role: Role | undefined // for detail
  public limitText = limitText

  // dialog
  @ViewChild(DataView) dv: DataView | undefined
  public dataViewControlsTranslations$: Observable<DataViewControlTranslations> | undefined
  public filterValue = 'WORKSPACE'
  public filterByDefault = 'name,type'
  public filterBy = this.filterByDefault
  public wsLoading = false
  public wRolesLoaded = false
  public iamRolesLoaded = false
  public iamAvailable = false
  public exceptionKey: string | undefined = undefined
  public quickFilterValue: RoleFilterType = 'ALL'
  public quickFilterValue2: RoleFilterType = 'WORKSPACE'
  public quickFilterItems: ExtendedSelectItem[]
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
  public slotName = 'onecx-permission-iam-user-roles'
  public roleListEmitter = new EventEmitter<IAMRole[]>()
  public componentPermissions: string[] = []

  constructor(
    private readonly router: Router,
    private readonly workspaceService: WorkspaceService,
    private readonly user: UserService,
    private readonly slotService: SlotService,
    private readonly iamRoleApi: RoleAPIService,
    private readonly wRoleApi: WorkspaceRolesAPIService,
    private readonly translate: TranslateService,
    private readonly msgService: PortalMessageService
  ) {
    this.hasEditPermission = this.user.hasPermission('WORKSPACE_ROLE#EDIT')
    this.hasCreatePermission = this.user.hasPermission('WORKSPACE_ROLE#CREATE')
    this.hasDeletePermission = this.user.hasPermission('WORKSPACE_ROLE#DELETE')
    // quick filter
    this.quickFilterItems = [
      { label: 'DIALOG.ROLE.QUICK_FILTER.ALL', value: 'ALL', tooltipKey: 'DIALOG.ROLE.QUICK_FILTER.ALL.TOOLTIP' },
      { label: 'DIALOG.ROLE.QUICK_FILTER.IAM', value: 'IAM', tooltipKey: 'DIALOG.ROLE.QUICK_FILTER.IAM.TOOLTIP' },
      {
        label: 'DIALOG.ROLE.QUICK_FILTER.WORKSPACE',
        value: 'WORKSPACE',
        tooltipKey: 'DIALOG.ROLE.QUICK_FILTER.WORKSPACE.TOOLTIP'
      }
    ]
  }

  public ngOnInit(): void {
    this.prepareTranslations()
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (this.workspace && changes['workspace']) {
      this.prepareWorkspaceRoleSearch()
      this.searchRoles()
    }
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
          console.error('searchAvailableRoles', err)
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
        this.wRolesLoaded = true
      }
    })
  }

  // This is done each time the role data arrives the component.
  private combineRoles() {
    const roles: Role[] = [] // trigger UI refresh
    this.wRoles.forEach((r) => {
      roles.push({ ...r, isIamRole: false, isWorkspaceRole: true, type: 'WORKSPACE' })
    })
    this.iamRoles.forEach((r) => {
      const wRole = roles.find((wr) => wr.name === r.name) // get role if exists on workspace
      if (wRole) {
        wRole.isIamRole = true
        wRole.type = 'WORKSPACE,IAM'
      } else roles.push({ ...r, isIamRole: true, isWorkspaceRole: false, type: 'IAM' })
    })
    const sortByRoleName = function (a: Role, b: Role): number {
      return (a.name ? a.name.toUpperCase() : '').localeCompare(b.name ? b.name.toUpperCase() : '')
    }
    roles.sort(sortByRoleName)
    this.roles = roles
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
    this.onQuickFilterChange({ value: 'ALL' }) // includes reload
    this.refreshIamRoles = !this.refreshIamRoles // trigger iam role refresh
    this.loadingIamRoles = true
    this.searchRoles(true)
  }

  /**
   * On Changes
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
          role.type = 'WORKSPACE,IAM'
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
   * Dialog preparation
   */
  private prepareTranslations(): void {
    this.dataViewControlsTranslations$ = this.translate
      .get(['ROLE.NAME', 'ROLE.TYPE', 'DIALOG.DATAVIEW.FILTER', 'DIALOG.DATAVIEW.FILTER_OF', 'DIALOG.DATAVIEW.SORT_BY'])
      .pipe(
        map((data) => {
          return {
            filterInputPlaceholder: data['DIALOG.DATAVIEW.FILTER'],
            filterInputTooltip: data['DIALOG.DATAVIEW.FILTER_OF'] + data['ROLE.NAME'] + ', ' + data['ROLE.TYPE'],
            sortDropdownTooltip: data['DIALOG.DATAVIEW.SORT_BY'],
            sortDropdownPlaceholder: data['DIALOG.DATAVIEW.SORT_BY']
          } as DataViewControlTranslations
        })
      )
  }

  /**
   * UI Events
   */
  public onQuickFilterChange(ev: any): void {
    if (ev.value) {
      this.quickFilterValue = ev.value
      this.quickFilterValue2 = this.quickFilterValue // bug in select button on click active button again
      if (ev.value === 'ALL') {
        this.filterBy = this.filterByDefault
        this.dv?.filter('', 'contains')
      } else {
        this.filterBy = 'type'
        this.dv?.filter(ev.value, 'contains')
      }
    } else this.quickFilterValue = this.quickFilterValue2 // remember, prevent null because bug
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
  public onFilterChange(filter: string): void {
    if (filter === '') {
      this.onQuickFilterChange({ value: 'ALL' })
      this.filterBy = 'name,type'
    }
    this.dv?.filter(filter, 'contains')
  }

  public onGoToPermission(): void {
    goToEndpoint(
      this.workspaceService,
      this.msgService,
      this.router,
      'onecx-permission',
      'onecx-permission-ui',
      'workspace',
      { 'workspace-name': this.workspace?.name }
    )
  }
}
