import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { Location } from '@angular/common'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ActivatedRoute, provideRouter, Router } from '@angular/router'
import { of, throwError } from 'rxjs'
import { TranslateTestingModule } from 'ngx-translate-testing'

import * as Accelerator from '@onecx/accelerator'
import { PortalMessageService } from '@onecx/portal-integration-angular'

import { Workspace, WorkspaceAbstract, WorkspaceAPIService, SearchWorkspacesResponse } from 'src/app/shared/generated'
import { WorkspaceSearchComponent } from './workspace-search.component'

describe('WorkspaceSearchComponent', () => {
  let component: WorkspaceSearchComponent
  let fixture: ComponentFixture<WorkspaceSearchComponent>

  let mockActivatedRoute: ActivatedRoute
  const mockRouter = { navigate: jasmine.createSpy('navigate') }
  const accSpy = {
    getLocation: jasmine.createSpy('getLocation').and.returnValue({ deploymentPath: '/path' })
  }
  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['info', 'error'])
  const wApiServiceSpy = {
    searchWorkspaces: jasmine.createSpy('searchWorkspaces').and.returnValue(of({})),
    getWorkspaceByName: jasmine.createSpy('getWorkspaceByName').and.returnValue(of({}))
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceSearchComponent],
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '', component: WorkspaceSearchComponent }]),
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceAPIService, useValue: wApiServiceSpy },
        { provide: Accelerator.getLocation, useValue: accSpy.getLocation }
      ]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspaceSearchComponent)
    accSpy.getLocation()
    component = fixture.componentInstance
    fixture.detectChanges()
    // to spy data: reset
    msgServiceSpy.info.calls.reset()
    msgServiceSpy.error.calls.reset()
    wApiServiceSpy.searchWorkspaces.calls.reset()
    // to spy data: refill with neutral data
    wApiServiceSpy.searchWorkspaces.and.returnValue(of({}))
  })

  describe('initialize', () => {
    it('should create', () => {
      expect(component).toBeTruthy()
      expect(component.deploymentPath).toEqual('')
    })
  })

  it('should search workspaces with results', (done) => {
    const w: WorkspaceAbstract = {
      name: 'name',
      theme: 'theme',
      baseUrl: 'url',
      displayName: ''
    }
    wApiServiceSpy.searchWorkspaces.and.returnValue(of({ stream: [w] } as SearchWorkspacesResponse))

    component.search()

    component.workspaces$.subscribe({
      next: (result) => {
        if (result) {
          expect(result.length).toBe(1)
          result.forEach((w) => {
            expect(w.name).toEqual('name')
          })
        }
        done()
      },
      error: done.fail
    })
  })

  it('should search workspaces without results', (done) => {
    wApiServiceSpy.searchWorkspaces.and.returnValue(of({ stream: [] } as SearchWorkspacesResponse))

    component.search()

    component.workspaces$.subscribe({
      next: (result) => {
        if (result) {
          expect(result.length).toBe(0)
        }
        done()
      },
      error: done.fail
    })
  })

  it('should call filter table onFilterChange', () => {
    component.table = jasmine.createSpyObj('table', ['filter'])

    component.onFilterChange('test')

    expect(component.table?.filter).toHaveBeenCalledWith('test', 'contains')
  })

  it('should set correct values onLayoutChange', () => {
    component.onLayoutChange('list')

    expect(component.viewMode).toEqual('list')
  })

  it('should set correct values onSortChange', () => {
    component.onSortChange('field')

    expect(component.sortField).toEqual('field')
  })

  it('should set correct values onSortDirChange', () => {
    component.onSortDirChange(true)

    expect(component.sortOrder).toEqual(-1)
  })

  it('should set correct values onSortDirChange', () => {
    component.onSortDirChange(false)

    expect(component.sortOrder).toEqual(1)
  })

  it('should behave correctly onGotoWorkspace', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const mockNewWorkspaceWindow = spyOn(window, 'open')
    const mockEvent = { stopPropagation: jasmine.createSpy() }
    const w: WorkspaceAbstract = {
      name: 'name',
      theme: 'theme',
      baseUrl: '/some/base/url',
      displayName: ''
    }

    component.onGotoWorkspace(mockEvent, w)

    expect(mockEvent.stopPropagation).toHaveBeenCalled()
    expect(window.open).toHaveBeenCalledWith(
      Location.joinWithSlash(Location.joinWithSlash(window.document.location.origin, ''), w.baseUrl || ''),
      '_blank'
    )

    component.onGotoWorkspace(mockEvent, { ...w, baseUrl: undefined })
  })

  it('should behave correctly onGotoMenu', () => {
    const mockEvent = {
      stopPropagation: jasmine.createSpy()
    }
    const w: WorkspaceAbstract = {
      name: 'name',
      theme: 'theme',
      baseUrl: '/some/base/url',
      displayName: ''
    }

    component.onGotoMenu(mockEvent, w)

    expect(mockEvent.stopPropagation).toHaveBeenCalled()
    expect(mockRouter.navigate).toHaveBeenCalledWith(['./', w.name, 'menu'], { relativeTo: component.route })
  })

  it('should return undefined if there is no ws object', () => {
    const result = component.getLogoUrl(undefined)

    expect(result).toBeUndefined()
  })

  it('should return correct imageUrl', () => {
    const result = component.getLogoUrl({ logoUrl: 'url' } as Workspace)

    expect(result).toBe('url')
  })

  it('should return uploaded imageUrl', () => {
    const result = component.getLogoUrl({ name: 'workspace' } as Workspace)

    expect(result).toBe('http://onecx-workspace-bff:8080/images/workspace/logo')
  })

  it('should call toggleShowCreateDialog when actionCallback is executed', () => {
    spyOn(component, 'toggleShowCreateDialog')

    component.ngOnInit()

    if (component.actions$) {
      component.actions$.subscribe((actions) => {
        const action = actions[0]
        action.actionCallback()
        expect(component.toggleShowCreateDialog).toHaveBeenCalled()
      })
    }
  })

  it('should call toggleShowImportDialog when actionCallback is executed', () => {
    spyOn(component, 'toggleShowImportDialog')

    component.ngOnInit()

    if (component.actions$) {
      component.actions$.subscribe((actions) => {
        const action = actions[1]
        action.actionCallback()
        expect(component.toggleShowImportDialog).toHaveBeenCalled()
      })
    }
  })

  it('should toggle showCreateDialog from false to true', () => {
    component.showCreateDialog = false

    component.toggleShowCreateDialog()

    expect(component.showCreateDialog).toBeTrue()
  })

  it('should toggle showImportDialog from true to false', () => {
    component.showImportDialog = true

    component.toggleShowImportDialog()

    expect(component.showImportDialog).toBeFalse()
  })

  it('should search workspaces but display error if API call fails', (done) => {
    const errorResponse = { status: 403, statusText: 'no permissions' }
    wApiServiceSpy.searchWorkspaces.and.returnValue(throwError(() => errorResponse))
    spyOn(console, 'error')

    component.search()

    component.workspaces$.subscribe({
      next: (result) => {
        if (result) {
          expect(result.length).toBe(0)
          expect(component.exceptionKey).toEqual('EXCEPTIONS.HTTP_STATUS_' + errorResponse.status + '.WORKSPACES')
          expect(console.error).toHaveBeenCalledWith('searchWorkspaces', errorResponse)
        }
        done()
      },
      error: done.fail
    })
  })

  describe('sort Workspaces by display name', () => {
    it('should sort workspaces by display name 1 - non-empty', () => {
      const a: WorkspaceAbstract = { name: 'a', displayName: 'a' }
      const b: WorkspaceAbstract = { name: 'b', displayName: 'b' }
      const c: WorkspaceAbstract = { name: 'c', displayName: 'c' }
      const workspaces = [b, c, a]

      workspaces.sort((x, y) => component.sortWorkspacesByName(x, y))

      expect(workspaces).toEqual([a, b, c])
    })

    it('should sort workspaces by display name 2 - empty and non-empty', () => {
      const a: WorkspaceAbstract = { name: 'a', displayName: '' }
      const b: WorkspaceAbstract = { name: '', displayName: '' }
      const c: WorkspaceAbstract = { name: '', displayName: '' }
      const workspaces = [b, c, a]

      workspaces.sort((x, y) => component.sortWorkspacesByName(x, y))

      expect(workspaces).toEqual([b, c, a])
    })

    it('should sort workspaces by display name 3 - empty display names', () => {
      const a: WorkspaceAbstract = { name: '', displayName: '' }
      const b: WorkspaceAbstract = { name: '', displayName: '' }
      const c: WorkspaceAbstract = { name: '', displayName: '' }
      const workspaces = [b, c, a]

      workspaces.sort((x, y) => component.sortWorkspacesByName(x, y))

      expect(workspaces).toEqual([b, c, a])
    })

    it('should sort workspaces by display name 4 - special characters', () => {
      const a: WorkspaceAbstract = { name: 'a', displayName: 'a' }
      const b: WorkspaceAbstract = { name: 'b', displayName: 'b' }
      const c: WorkspaceAbstract = { name: '$', displayName: '$' }
      const workspaces = [b, c, a]

      workspaces.sort((x, y) => component.sortWorkspacesByName(x, y))

      expect(workspaces).toEqual([c, a, b])
    })
  })
})
