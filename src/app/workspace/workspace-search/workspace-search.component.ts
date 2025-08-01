import { Component, OnInit, ViewChild } from '@angular/core'
import { Location } from '@angular/common'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { Observable, catchError, finalize, map, of } from 'rxjs'

import { Action } from '@onecx/angular-accelerator'
import { DataViewControlTranslations } from '@onecx/portal-integration-angular'
import { getLocation } from '@onecx/accelerator'

import {
  ImagesInternalAPIService,
  RefType,
  Workspace,
  WorkspaceAPIService,
  WorkspaceAbstract
} from 'src/app/shared/generated'
import { bffImageUrl, limitText } from 'src/app/shared/utils'

@Component({
  selector: 'app-workspace-search',
  templateUrl: './workspace-search.component.html',
  styleUrls: ['./workspace-search.component.scss']
})
export class WorkspaceSearchComponent implements OnInit {
  public loading = false
  public exceptionKey: string | undefined = undefined
  public actions$: Observable<Action[]> | undefined
  public showCreateDialog = false
  public showImportDialog = false
  public limitText = limitText
  public getLocation = getLocation

  public workspaces$!: Observable<Workspace[]>
  public viewMode: 'list' | 'grid' = 'grid'
  public filter: string | undefined
  public sortField = 'displayName'
  public sortOrder = 1
  public dataViewControlsTranslations$: Observable<DataViewControlTranslations> | undefined

  @ViewChild('table', { static: false }) table!: any

  constructor(
    private readonly workspaceApi: WorkspaceAPIService,
    public readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly translate: TranslateService,
    private readonly imageApi: ImagesInternalAPIService
  ) {}

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
        return of([] as Workspace[])
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

  public onFilterChange(event: string): void {
    this.table.filter(event, 'contains')
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

  public onGotoWorkspace(ev: any, workspace: Workspace, deploymentPath: string): void {
    ev.stopPropagation()
    if (!workspace.baseUrl) return
    const url = Location.joinWithSlash(
      Location.joinWithSlash(window.document.location.origin, deploymentPath),
      workspace.baseUrl
    )
    window.open(url, '_blank')
  }

  public onGotoMenu(ev: any, workspace: Workspace): void {
    ev.stopPropagation()
    this.router.navigate(['./', workspace.name, 'menu'], { relativeTo: this.route })
  }

  public getLogoUrl(workspace: Workspace | undefined): string | undefined {
    if (!workspace) return undefined
    if (workspace.logoUrl && workspace.logoUrl != '') {
      return workspace.logoUrl
    }
    return bffImageUrl(this.imageApi.configuration.basePath, workspace.name, RefType.Logo)
  }
}
