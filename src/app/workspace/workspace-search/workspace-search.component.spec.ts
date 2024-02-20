// import { NO_ERRORS_SCHEMA } from '@angular/core'
// import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
// import { HttpClient } from '@angular/common/http'
// import { HttpClientTestingModule } from '@angular/common/http/testing'
// import { Router } from '@angular/router'
// import { ActivatedRoute } from '@angular/router'
// import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
// import { of, throwError } from 'rxjs'

// import { createTranslateLoader, PortalMessageService } from '@onecx/portal-integration-angular'
// import { Workspace, WorkspaceAPIService } from 'src/app/shared/generated'

// import { WorkspaceSearchComponent } from './workspace-search.component'

// class MockRouter {
//   navigate = jasmine.createSpy('navigate')
// }

// describe('WorkspaceSearchComponent', () => {
//   let component: WorkspaceSearchComponent
//   let fixture: ComponentFixture<WorkspaceSearchComponent>
//   let mockActivatedRoute: ActivatedRoute
//   let mockRouter = new MockRouter()
//   // eslint-disable-next-line @typescript-eslint/no-unused-vars
//   let mockWindow: any

//   const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['info', 'error'])
//   const apiServiceSpy = {
//     getAllPortals: jasmine.createSpy('getAllPortals').and.returnValue(of({}))
//   }

//   beforeEach(waitForAsync(() => {
//     TestBed.configureTestingModule({
//       declarations: [WorkspaceSearchComponent],
//       imports: [
//         HttpClientTestingModule,
//         TranslateModule.forRoot({
//           loader: {
//             provide: TranslateLoader,
//             useFactory: createTranslateLoader,
//             deps: [HttpClient]
//           }
//         })
//       ],
//       schemas: [NO_ERRORS_SCHEMA],
//       providers: [
//         { provide: ActivatedRoute, useValue: mockActivatedRoute },
//         { provide: Router, useValue: mockRouter },
//         { provide: PortalMessageService, useValue: msgServiceSpy },
//         { provide: WorkspaceAPIService, useValue: apiServiceSpy }
//       ]
//     }).compileComponents()
//     msgServiceSpy.info.calls.reset()
//     msgServiceSpy.error.calls.reset()
//     apiServiceSpy.getAllPortals.calls.reset()
//   }))

//   beforeEach(() => {
//     fixture = TestBed.createComponent(WorkspaceSearchComponent)
//     component = fixture.componentInstance
//     fixture.detectChanges()
//   })

//   it('should create', () => {
//     expect(component).toBeTruthy()
//   })

//   it('should call toggleShowCreateDialog when actionCallback is executed', () => {
//     spyOn(component, 'toggleShowCreateDialog')

//     component.ngOnInit()
//     const action = component.actions[0]
//     action.actionCallback()

//     expect(component.toggleShowCreateDialog).toHaveBeenCalled()
//   })

//   it('should call toggleShowImportDialog when actionCallback is executed', () => {
//     spyOn(component, 'toggleShowImportDialog')

//     component.ngOnInit()
//     const action = component.actions[1]
//     action.actionCallback()

//     expect(component.toggleShowImportDialog).toHaveBeenCalled()
//   })

//   it('should toggle showCreateDialog from false to true', () => {
//     component.showCreateDialog = false

//     component.toggleShowCreateDialog()

//     expect(component.showCreateDialog).toBeTrue()
//   })

//   it('should toggle showImportDialog from true to false', () => {
//     component.showImportDialog = true

//     component.toggleShowImportDialog()

//     expect(component.showImportDialog).toBeFalse()
//   })

//   it('should correctly assign results if API call returns some data', () => {
//     const portal: Workspace = {
//       name: 'name',
//       theme: 'theme',
//       baseUrl: 'url',
//       id: 'id'
//     }
//     apiServiceSpy.getAllPortals.and.returnValue(of([portal]))
//     component.workspaceItems = []

//     component.search()

//     expect(component.workspaceItems[0]).toEqual(portal)
//     expect(component.sortField).toEqual('name')
//   })

//   it('should display info if no portals available', () => {
//     apiServiceSpy.getAllPortals.and.returnValue(of([]))

//     component.search()

//     expect(msgServiceSpy.info).toHaveBeenCalledWith({ summaryKey: 'SEARCH.MSG_NO_RESULTS' })
//   })

//   it('should display error if API call fails', () => {
//     apiServiceSpy.getAllPortals.and.returnValue(throwError(() => new Error()))

//     component.search()

//     expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'SEARCH.ERROR' })
//   })

//   it('should call filter table onFilterChange', () => {
//     component.table = jasmine.createSpyObj('table', ['filter'])

//     component.onFilterChange('test')

//     expect(component.table?.filter).toHaveBeenCalledWith('test', 'contains')
//   })

//   it('should set correct values onLayoutChange', () => {
//     component.onLayoutChange('EDIT')

//     expect(component.viewMode).toEqual('EDIT')
//   })

//   it('should set correct values onSortChange', () => {
//     component.onSortChange('field')

//     expect(component.sortField).toEqual('field')
//   })

//   it('should set correct values onSortDirChange', () => {
//     component.onSortDirChange(true)

//     expect(component.sortOrder).toEqual(-1)
//   })

//   it('should behave correctly onGotoPortal', () => {
//     mockWindow = spyOn(window, 'open')
//     const mockEvent = {
//       stopPropagation: jasmine.createSpy()
//     }
//     const portal: Workspace = {
//       name: 'name',
//       theme: 'theme',
//       baseUrl: '/some/base/url'
//     }

//     component.onGotoWorkspace(mockEvent, portal)

//     expect(mockEvent.stopPropagation).toHaveBeenCalled()
//     expect(window.open).toHaveBeenCalledWith(window.document.location.href + '../../../..' + portal.baseUrl, '_blank')
//   })

//   it('should behave correctly onGotoMenu', () => {
//     const mockEvent = {
//       stopPropagation: jasmine.createSpy()
//     }
//     const portal: Workspace = {
//       name: 'name',
//       theme: 'theme',
//       baseUrl: '/some/base/url',
//       id: 'id'
//     }

//     component.onGotoMenu(mockEvent, portal)

//     expect(mockEvent.stopPropagation).toHaveBeenCalled()
//     expect(mockRouter.navigate).toHaveBeenCalledWith(['./', portal.id, 'menu'], { relativeTo: mockActivatedRoute })
//   })

//   it('should behave return correct string on getDescriptionString', () => {
//     spyOnProperty(window, 'innerWidth').and.returnValue(500)
//     const text = 'text'

//     const result = component.getDescriptionString(text)

//     expect(result).toEqual(text)
//   })

//   it('should behave return correct string on getDescriptionString: empty string', () => {
//     const text = ''

//     const result = component.getDescriptionString(text)

//     expect(result).toEqual('')
//   })
// })
