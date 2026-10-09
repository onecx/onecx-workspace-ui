import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideRouter, Router } from '@angular/router'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, throwError } from 'rxjs'

import { RowListGridData, DataSortDirection } from '@onecx/angular-accelerator'
import { AppStateServiceMock, provideAppStateServiceMock } from '@onecx/angular-integration-interface/mocks'
import { providePermissionService } from '@onecx/angular-utils'
import { Workspace } from '@onecx/integration-interface'

import {
  SearchWorkspacesResponse,
  Workspace as GeneratedWorkspace,
  WorkspaceAPIService
} from 'src/app/shared/generated'
import { WorkspaceSearchComponent } from './workspace-search.component'

const currentWorkspace: Partial<Workspace> = {
  workspaceName: 'workspace1',
  displayName: 'Workspace 1'
}

describe('WorkspaceSearchComponent', () => {
  let component: WorkspaceSearchComponent
  let fixture: ComponentFixture<WorkspaceSearchComponent>

  let mockAppStateService: AppStateServiceMock
  let router: Router
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let searchWorkspacesSpy: jasmine.Spy

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        WorkspaceSearchComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideAppStateServiceMock(),
        ...providePermissionService(),
        provideRouter([{ path: '', component: WorkspaceSearchComponent }]),
        // neutral fallback so any DI-resolved client is safe before we stub the instance below
        { provide: WorkspaceAPIService, useValue: { searchWorkspaces: () => of({}) } }
      ]
    }).compileComponents()

    mockAppStateService = TestBed.inject(AppStateServiceMock)
    mockAppStateService.currentWorkspace$.publish({
      workspaceName: currentWorkspace.workspaceName
    } as Workspace)

    fixture = TestBed.createComponent(WorkspaceSearchComponent)
    component = fixture.componentInstance
    router = TestBed.inject(Router)
    spyOn(router, 'navigate').and.resolveTo(true)

    // The module-level useValue override is not honoured by the component's own inject(),
    // so stub the exact instance the component resolved. Done before detectChanges() so the
    // ngOnInit-triggered initial load never reaches the network.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    searchWorkspacesSpy = spyOn((component as any).workspaceApi, 'searchWorkspaces').and.returnValue(of({}))
  }))

  function triggerLoad(returnValue: unknown): void {
    searchWorkspacesSpy.and.returnValue(returnValue as never)
    fixture.detectChanges()
  }

  describe('initialize', () => {
    it('should create', () => {
      expect(component).toBeTruthy()
    })

    it('should set currentWorkspaceName from AppStateService', () => {
      expect(component.currentWorkspaceName).toEqual(currentWorkspace.workspaceName)
    })
  })

  describe('loadWorkspace', () => {
    it('should load workspaces - success with results', () => {
      const w1 = { name: 'b', displayName: 'B' } as GeneratedWorkspace
      const w2 = { name: 'a', displayName: 'A' } as GeneratedWorkspace
      triggerLoad(of({ stream: [w1, w2] } as SearchWorkspacesResponse))

      expect(component.loading()).toBeFalse()
      expect(component.exceptionKey()).toBeUndefined()
      expect(component.data().length).toBe(2)
      expect((component.data()[0] as unknown as GeneratedWorkspace).name).toEqual('a')
    })

    it('should load workspaces - success without results', () => {
      triggerLoad(of({ stream: [] } as SearchWorkspacesResponse))

      expect(component.loading()).toBeFalse()
      expect(component.exceptionKey()).toBeUndefined()
      expect(component.data().length).toBe(0)
    })

    it('should load workspaces - failed', () => {
      const errorResponse = { status: 403, statusText: 'no permissions' }
      spyOn(console, 'error')
      triggerLoad(throwError(() => errorResponse))

      expect(component.loading()).toBeFalse()
      expect(component.exceptionKey()).toEqual('EXCEPTIONS.HTTP_STATUS_' + errorResponse.status + '.WORKSPACES')
      expect(console.error).toHaveBeenCalledWith('searchWorkspaces', errorResponse)
      expect(component.data().length).toBe(0)
    })

    it('should default to empty workspaces when the response has no stream', () => {
      // a response without a `stream` property exercises the `data?.stream ?? []` fallback
      triggerLoad(of({} as SearchWorkspacesResponse))

      expect(component.loading()).toBeFalse()
      expect(component.exceptionKey()).toBeUndefined()
      expect(component.data().length).toBe(0)
    })
  })

  describe('convertToWorkspaces', () => {
    it('should return undefined if data is undefined', () => {
      expect(component.convertToWorkspaces(undefined)).toBeUndefined()
    })

    it('should return the data cast to Workspace[] if data is defined', () => {
      const data = [{ name: 'a' }] as unknown as RowListGridData[]

      expect(component.convertToWorkspaces(data)).toEqual(data as unknown as GeneratedWorkspace[])
    })
  })

  describe('sortWorkspacesByName', () => {
    it('should sort workspaces by display name 1 - non-empty', () => {
      const a = { name: 'a', displayName: 'a' } as GeneratedWorkspace
      const b = { name: 'b', displayName: 'b' } as GeneratedWorkspace
      const c = { name: 'c', displayName: 'c' } as GeneratedWorkspace
      const workspaces = [b, c, a]

      workspaces.sort((x, y) => component.sortWorkspacesByName(x, y))

      expect(workspaces).toEqual([a, b, c])
    })

    it('should sort workspaces by display name 2 - special characters', () => {
      const a = { name: 'a', displayName: 'a' } as GeneratedWorkspace
      const b = { name: 'b', displayName: 'b' } as GeneratedWorkspace
      const c = { name: '$', displayName: '$' } as GeneratedWorkspace
      const workspaces = [b, c, a]

      workspaces.sort((x, y) => component.sortWorkspacesByName(x, y))

      expect(workspaces).toEqual([c, a, b])
    })
  })

  describe('filter events', () => {
    it('should do nothing onGlobalFilter if data is undefined', () => {
      component.onGlobalFilter('name', undefined)

      expect(component.filteredData()).toBeUndefined()
    })

    it('should reset filteredData onGlobalFilter if value is empty', () => {
      const data = [{ name: 'a', displayName: 'A' }] as unknown as RowListGridData[]

      component.onGlobalFilter('', data)

      expect(component.globalFilterValue).toEqual('')
      expect(component.filteredData()).toBeUndefined()
    })

    it('should default an undefined value to an empty filter onGlobalFilter', () => {
      // an undefined `value` (with data present) exercises the `value ?? ''` fallback
      const data = [{ name: 'a', displayName: 'A' }] as unknown as RowListGridData[]

      component.onGlobalFilter(undefined, data)

      expect(component.globalFilterValue).toEqual('')
      expect(component.filteredData()).toBeUndefined()
    })

    it('should filter data by name onGlobalFilter', () => {
      const data = [
        { name: 'workspace-a', displayName: 'Alpha' },
        { name: 'workspace-b', displayName: 'Beta' }
      ] as unknown as RowListGridData[]

      component.onGlobalFilter('alpha', data)

      expect(component.globalFilterValue).toEqual('alpha')
      expect(component.filteredData()?.length).toBe(1)
      expect((component.filteredData() as any)[0].name).toEqual('workspace-a')
    })

    it('should filter data by displayName onGlobalFilter', () => {
      const data = [
        { name: 'workspace-a', displayName: 'Alpha' },
        { name: 'workspace-b', displayName: 'Beta' }
      ] as unknown as RowListGridData[]

      component.onGlobalFilter('beta', data)

      expect(component.filteredData()?.length).toBe(1)
      expect((component.filteredData() as any)[0].name).toEqual('workspace-b')
    })

    it('should reset globalFilterValue and filteredData onClearGlobalFilter', () => {
      component.globalFilterValue = 'something'
      component.filteredData.set([{ name: 'a' }] as unknown as RowListGridData[])

      component.onClearGlobalFilter()

      expect(component.globalFilterValue).toEqual('')
      expect(component.filteredData()).toBeUndefined()
    })
  })

  describe('sort events', () => {
    it('should set correct values onSortChange', () => {
      component.onSortChange({ sortColumn: 'name', sortDirection: DataSortDirection.DESCENDING })

      expect(component.sortField).toEqual('name')
      expect(component.sortDirection).toEqual(DataSortDirection.DESCENDING)
    })
  })

  describe('page actions', () => {
    it('should set workspaceImportVisible on onImportWorkspaceClick', () => {
      component.onImportWorkspaceClick()

      expect(component.workspaceImportVisible()).toBeTrue()
    })

    it('should navigate on onWorkspaceCreation when workspace is defined', () => {
      const workspace = { name: 'new-workspace' } as GeneratedWorkspace

      component.onWorkspaceCreation(workspace)

      expect(router.navigate).toHaveBeenCalledWith(['./new-workspace'], { relativeTo: component['route'] })
    })

    it('should not navigate on onWorkspaceCreation when workspace is undefined', () => {
      component.onWorkspaceCreation(undefined)

      expect(router.navigate).not.toHaveBeenCalled()
    })

    it('should set workspaceCreateVisible when create actionCallback is executed', (done) => {
      component.actions$.subscribe((actions) => {
        const action = actions[0]
        action.actionCallback?.()
        expect(component.workspaceCreateVisible()).toBeTrue()
        done()
      })
    })

    it('should call onImportWorkspaceClick when import actionCallback is executed', (done) => {
      component.actions$.subscribe((actions) => {
        const action = actions[1]
        action.actionCallback?.()
        expect(component.workspaceImportVisible()).toBeTrue()
        done()
      })
    })
  })
})
