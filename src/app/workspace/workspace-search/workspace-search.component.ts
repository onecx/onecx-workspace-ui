import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterModule } from '@angular/router'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { BehaviorSubject, Observable, Subject, catchError, finalize, map, of, switchMap } from 'rxjs'

import { ButtonModule } from 'primeng/button'
import { CardModule } from 'primeng/card'
import { FloatLabelModule } from 'primeng/floatlabel'
import { InputGroupModule } from 'primeng/inputgroup'
import { InputGroupAddonModule } from 'primeng/inputgroupaddon'
import { InputTextModule } from 'primeng/inputtext'
import { MessageModule } from 'primeng/message'
import { TooltipModule } from 'primeng/tooltip'

import { getLocation } from '@onecx/accelerator'
import { AppStateService } from '@onecx/angular-integration-interface'
import {
  Action,
  AngularAcceleratorModule,
  RowListGridData,
  DataSortDirection,
  DataTableColumn,
  ColumnType
} from '@onecx/angular-accelerator'
import { PortalPageComponent } from '@onecx/angular-utils'

import {
  ImagesInternalAPIService,
  RefType,
  Workspace,
  WorkspaceAPIService,
  WorkspaceAbstract
} from 'src/app/shared/generated'
import { Utils } from 'src/app/shared/utils'
import { ImageContainerComponent } from 'src/app/shared/image-container.old/image-container.component'
import { WorkspaceCreateComponent } from '../workspace-create/workspace-create.component'
import { WorkspaceImportComponent } from '../workspace-import/workspace-import.component'
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop'

@Component({
  selector: 'app-workspace-search',
  standalone: true,
  imports: [
    AngularAcceleratorModule,
    ButtonModule,
    CardModule,
    FloatLabelModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputTextModule,
    MessageModule,
    RouterModule,
    TooltipModule,
    TranslateModule,
    // components
    PortalPageComponent,
    WorkspaceCreateComponent,
    WorkspaceImportComponent,
    ImageContainerComponent
  ],
  templateUrl: './workspace-search.component.html',
  styleUrls: ['./workspace-search.component.scss']
})
export class WorkspaceSearchComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly workspaceApi = inject(WorkspaceAPIService)
  private readonly translate = inject(TranslateService)
  private readonly imageApi = inject(ImagesInternalAPIService)
  private readonly appState = inject(AppStateService)
  private readonly destroyRef = inject(DestroyRef)
  // signals
  public readonly workspaceImportVisible = signal(false)
  public readonly workspaceCreateVisible = signal(false)
  public readonly workspaceImported = signal(false)
  // data
  private readonly dataSubject$ = new BehaviorSubject<RowListGridData[]>([])
  public data$: Observable<RowListGridData[]> = this.dataSubject$.asObservable()
  public readonly data = toSignal(this.data$, { initialValue: [] as RowListGridData[] })
  private readonly loadTrigger$ = new Subject<void>()
  public readonly filteredData = signal<RowListGridData[] | undefined>(undefined)
  // dialog
  public readonly loading = signal(false)
  public readonly exceptionKey = signal<string | undefined>(undefined)
  public readonly actions$: Observable<Action[]> = this.translate
    .get([
      'ACTIONS.CREATE.WORKSPACE',
      'ACTIONS.CREATE.WORKSPACE.TOOLTIP',
      'ACTIONS.IMPORT.LABEL',
      'ACTIONS.IMPORT.TOOLTIP'
    ])
    .pipe(
      map((data) => [
        {
          label: data['ACTIONS.CREATE.WORKSPACE'],
          title: data['ACTIONS.CREATE.WORKSPACE.TOOLTIP'],
          actionCallback: () => this.workspaceCreateVisible.set(true),
          permission: 'THEME#CREATE',
          icon: 'pi pi-plus',
          show: 'always'
        },
        {
          label: data['ACTIONS.IMPORT.LABEL'],
          title: data['ACTIONS.IMPORT.TOOLTIP'],
          actionCallback: () => this.onImportWorkspaceClick(),
          permission: 'THEME#IMPORT',
          icon: 'pi pi-upload',
          show: 'always'
        }
      ])
    )
  public readonly actions = toSignal(this.actions$, { initialValue: [] as Action[] })
  public showCreateDialog = false
  public showImportDialog = false
  public RefType = RefType
  public getLocation = getLocation
  // data
  public workspaces$!: Observable<Workspace[]>
  public currentWorkspaceName: string | undefined
  public viewMode: 'list' | 'grid' = 'grid'
  public filter: string | undefined
  public globalFilterValue = ''
  public sortColumns = this.prepareSortColumns()
  public sortColumnKeys = this.sortColumns.map((c) => c.id)
  public sortDirection: DataSortDirection = DataSortDirection.ASCENDING
  public sortField = 'displayName'
  public Utils = Utils
  public imageBasePath = this.imageApi.configuration.basePath

  constructor() {
    this.appState.currentWorkspace$.asObservable().subscribe((workspace) => {
      this.currentWorkspaceName = workspace?.workspaceName
    })
    this.loadTrigger$
      .pipe(
        switchMap(() => {
          this.loading.set(true)
          this.exceptionKey.set(undefined)
          return this.workspaceApi.searchWorkspaces({ searchWorkspacesRequest: {} }).pipe(
            map((data) => {
              const workspaces = data?.stream ?? []
              workspaces.sort(Utils.sortByDisplayName)
              return workspaces as unknown[] as RowListGridData[]
            }),
            catchError((err) => {
              this.exceptionKey.set('EXCEPTIONS.HTTP_STATUS_' + Utils.mapping_error_status(err.status) + '.WORKSPACES')
              console.error('searchWorkspaces', err)
              return of([] as RowListGridData[])
            }),
            finalize(() => this.loading.set(false))
          )
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((data) => this.dataSubject$.next(data))
  }

  ngOnInit(): void {
    this.loadWorkspace()
  }

  public loadWorkspace(): void {
    this.loadTrigger$.next()
  }

  public convertToWorkspaces(data?: RowListGridData[]): Workspace[] | undefined {
    if (!data) return undefined
    return data as unknown[] as Workspace[]
  }

  public sortWorkspacesByName(a: WorkspaceAbstract, b: WorkspaceAbstract): number {
    return a.displayName.toUpperCase().localeCompare(b.displayName.toUpperCase())
  }

  /**
   * FILTER & SORT Events
   */
  public onGlobalFilter(value?: string, data?: RowListGridData[]): void {
    if (!data) return
    this.globalFilterValue = value ?? ''
    if (this.globalFilterValue === '') this.filteredData.set(undefined)
    else {
      this.filteredData.set(
        data?.filter(
          (row) =>
            row['name']?.toString().toLowerCase().includes(this.globalFilterValue.toLowerCase()) ||
            row['displayName']?.toString().toLowerCase().includes(this.globalFilterValue.toLowerCase())
        )
      )
    }
  }

  public onClearGlobalFilter(): void {
    this.globalFilterValue = ''
    this.filteredData.set(undefined)
  }

  public onSortChange(event: { sortColumn: string; sortDirection: DataSortDirection }): void {
    this.sortField = event.sortColumn
    this.sortDirection = event.sortDirection
  }

  private prepareSortColumns(): DataTableColumn[] {
    return [
      {
        columnType: ColumnType.STRING,
        nameKey: 'WORKSPACE.NAME',
        id: 'name',
        sortable: true
      },
      {
        columnType: ColumnType.STRING,
        nameKey: 'WORKSPACE.DISPLAY_NAME',
        id: 'displayName',
        sortable: true
      },
      {
        columnType: ColumnType.STRING,
        nameKey: 'INTERNAL.CREATION_DATE',
        id: 'creationDate',
        sortable: true
      }
    ]
  }

  /**
   * UI EVENTS
   */
  public onImportWorkspaceClick(): void {
    this.workspaceImportVisible.set(true)
  }

  public onWorkspaceCreation(workspace: Workspace | undefined): void {
    if (workspace) {
      this.router.navigate(['./' + workspace.name], { relativeTo: this.route })
    }
  }
}
