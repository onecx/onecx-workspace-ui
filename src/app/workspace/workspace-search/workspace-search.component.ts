import { Component, OnInit } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { Observable, catchError, finalize, map, of } from 'rxjs'
import { DataView } from 'primeng/dataview'

import { getLocation } from '@onecx/accelerator'
import { Action } from '@onecx/angular-accelerator'
import { AppStateService } from '@onecx/angular-integration-interface'
import { DataViewControlTranslations } from '@onecx/portal-integration-angular'

import {
  ImagesInternalAPIService,
  RefType,
  Workspace,
  WorkspaceAPIService,
  WorkspaceAbstract
} from 'src/app/shared/generated'
import { Utils } from 'src/app/shared/utils'

@Component({
  selector: 'app-workspace-search',
  templateUrl: './workspace-search.component.html',
  styleUrls: ['./workspace-search.component.scss']
})
export class WorkspaceSearchComponent implements OnInit {
  // dialog
  public loading = false
  public exceptionKey: string | undefined = undefined
  public actions$: Observable<Action[]> | undefined
  public showCreateDialog = false
  public showImportDialog = false
  public RefType = RefType
  public Utils = Utils
  public getLocation = getLocation
  public dataViewControlsTranslations$: Observable<DataViewControlTranslations> | undefined

  // data
  public workspaces$!: Observable<Workspace[]>
  public currentWorkspaceName: string | undefined
  public viewMode: 'list' | 'grid' = 'grid'
  public filter: string | undefined
  public sortField = 'displayName'
  public sortOrder = 1
  public imageBasePath = this.imageApi.configuration.basePath

  constructor(
    private readonly workspaceApi: WorkspaceAPIService,
    private readonly translate: TranslateService,
    private readonly appState: AppStateService,
    private readonly imageApi: ImagesInternalAPIService
  ) {
    this.appState.currentWorkspace$.asObservable().subscribe((workspace) => {
      this.currentWorkspaceName = workspace?.workspaceName
    })
  }

  ngOnInit() {
    this.prepareDialogTranslations()
    this.prepareActionButtons()
    this.search()
  }

  public search(): void {
    this.loading = true
    this.workspaces$ = this.workspaceApi.searchWorkspaces({ searchWorkspacesRequest: {} }).pipe(
      map((data) => data.stream?.sort(this.sortWorkspacesByName) ?? []),
      catchError((err) => {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.WORKSPACES'
        console.error('searchWorkspaces', err)
        return of([])
      }),
      finalize(() => (this.loading = false))
    )
  }
  public sortWorkspacesByName(a: WorkspaceAbstract, b: WorkspaceAbstract): number {
    return a.displayName.toUpperCase().localeCompare(b.displayName.toUpperCase())
  }

  /**
   * DIALOG
   */
  private prepareDialogTranslations() {
    this.dataViewControlsTranslations$ = this.translate
      .get([
        'WORKSPACE.DISPLAY_NAME',
        'WORKSPACE.THEME',
        'DIALOG.DATAVIEW.FILTER',
        'DIALOG.DATAVIEW.FILTER_OF',
        'DIALOG.DATAVIEW.SORT_BY'
      ])
      .pipe(
        map((data) => {
          return {
            filterInputPlaceholder: data['DIALOG.DATAVIEW.FILTER'],
            filterInputTooltip:
              data['DIALOG.DATAVIEW.FILTER_OF'] + data['WORKSPACE.DISPLAY_NAME'] + ', ' + data['WORKSPACE.THEME'],
            sortDropdownTooltip: data['DIALOG.DATAVIEW.SORT_BY'],
            sortDropdownPlaceholder: data['DIALOG.DATAVIEW.SORT_BY']
          } as DataViewControlTranslations
        })
      )
  }

  private prepareActionButtons() {
    this.actions$ = this.translate
      .get([
        'ACTIONS.CREATE.WORKSPACE',
        'ACTIONS.CREATE.WORKSPACE.TOOLTIP',
        'ACTIONS.IMPORT.LABEL',
        'ACTIONS.IMPORT.WORKSPACE'
      ])
      .pipe(
        map((data) => {
          return [
            {
              label: data['ACTIONS.CREATE.WORKSPACE'],
              title: data['ACTIONS.CREATE.WORKSPACE.TOOLTIP'],
              actionCallback: () => this.toggleShowCreateDialog(),
              icon: 'pi pi-plus',
              show: 'always',
              permission: 'WORKSPACE#CREATE'
            },
            {
              label: data['ACTIONS.IMPORT.LABEL'],
              title: data['ACTIONS.IMPORT.WORKSPACE'],
              actionCallback: () => this.toggleShowImportDialog(),
              icon: 'pi pi-upload',
              show: 'always',
              permission: 'WORKSPACE#IMPORT'
            }
          ]
        })
      )
  }

  /**
   * UI EVENTS
   */
  public toggleShowCreateDialog(): void {
    this.showCreateDialog = !this.showCreateDialog
  }

  public toggleShowImportDialog(): void {
    this.showImportDialog = !this.showImportDialog
  }

  public onFilterChange(event: string, dv: DataView): void {
    dv.filter(event)
  }

  public onLayoutChange(viewMode: 'list' | 'grid') {
    this.viewMode = viewMode
  }

  public onSortChange(field: string) {
    this.sortField = field
  }
  public onSortDirChange(asc: boolean) {
    this.sortOrder = asc ? -1 : 1
  }
}
