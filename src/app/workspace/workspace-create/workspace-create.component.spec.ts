import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { provideRouter, Router } from '@angular/router'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, throwError } from 'rxjs'
import { provideNoopAnimations } from '@angular/platform-browser/animations'

import { SlotService } from '@onecx/angular-remote-components'
import { SlotServiceMock } from '@onecx/angular-remote-components/mocks'
import { PortalMessageService, ThemeService } from '@onecx/angular-integration-interface'

import { ProductAPIService, Workspace, WorkspaceAPIService } from 'src/app/shared/generated'
import { Theme, WorkspaceCreateComponent } from './workspace-create.component'

const workspace: Workspace = {
  id: 'id',
  name: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url',
  homePage: '/homepage',
  displayName: 'displayName'
}
const themesOrg: Theme[] = [
  { name: 'theme1', displayName: 'Theme 1', logoUrl: '/logo', faviconUrl: '/favicon' },
  { name: 'theme2', displayName: 'Theme 2' }
]

class MockThemeService {
  currentTheme$ = { asObservable: () => of({ name: 'theme' }) }
}

describe('WorkspaceCreateComponent', () => {
  let component: WorkspaceCreateComponent
  let fixture: ComponentFixture<WorkspaceCreateComponent>
  let mockThemeService: MockThemeService
  let router: Router
  // WorkspaceAPIService / ProductAPIService / PortalMessageService are providedIn 'any', so the
  // component holds its own instances - root-level providers would be shadowed, thus spy on the
  // actual instances the component uses
  let createWorkspaceSpy: jasmine.Spy
  let searchAvailableProductsSpy: jasmine.Spy
  let messageSuccessSpy: jasmine.Spy
  let messageErrorSpy: jasmine.Spy

  beforeEach(waitForAsync(() => {
    mockThemeService = new MockThemeService()
    TestBed.configureTestingModule({
      imports: [
        WorkspaceCreateComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([{ path: '', component: WorkspaceCreateComponent }]),
        { provide: ThemeService, useValue: mockThemeService },
        { provide: SlotService, useClass: SlotServiceMock }
      ]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspaceCreateComponent)
    component = fixture.componentInstance
    router = TestBed.inject(Router)
    createWorkspaceSpy = spyOn(
      (component as unknown as { workspaceApi: WorkspaceAPIService }).workspaceApi,
      'createWorkspace'
    )
    createWorkspaceSpy.and.returnValue(of({}))
    searchAvailableProductsSpy = spyOn(
      (component as unknown as { productApi: ProductAPIService }).productApi,
      'searchAvailableProducts'
    )
    searchAvailableProductsSpy.and.returnValue(of({}))
    messageSuccessSpy = spyOn((component as unknown as { message: PortalMessageService }).message, 'success')
    messageErrorSpy = spyOn((component as unknown as { message: PortalMessageService }).message, 'error')

    component.formGroup = new FormGroup({
      name: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
      displayName: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
      theme: new FormControl(null),
      homePage: new FormControl('homepage', [Validators.maxLength(255)]),
      logoUrl: new FormControl('', [Validators.maxLength(255)]),
      baseUrl: new FormControl('/some/base/url', [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern('^/.*')
      ]),
      footerLabel: new FormControl(null, [Validators.maxLength(255)]),
      description: new FormControl(null, [Validators.maxLength(255)])
    })
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()

    component.currentTheme$.subscribe()
  })

  it('should create a workspace', () => {
    createWorkspaceSpy.and.returnValue(of({ resource: workspace }))
    const navigateSpy = spyOn(router, 'navigate')

    component.saveWorkspace()

    expect(navigateSpy).toHaveBeenCalledWith(['./name'], { relativeTo: jasmine.anything() })
    expect(messageSuccessSpy).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.MESSAGE.CREATE.OK' })
  })

  it('should not navigate when workspace creation fails', () => {
    const errorResponse = { status: 400, statusText: 'Error on creationg a workspace' }
    createWorkspaceSpy.and.returnValue(throwError(() => errorResponse))
    spyOn(console, 'error')
    const navigateSpy = spyOn(router, 'navigate')

    component.saveWorkspace()

    expect(messageErrorSpy).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.MESSAGE.CREATE.NOK' })
    expect(navigateSpy).not.toHaveBeenCalled()
  })

  it('should display error when workspace creation fails', () => {
    const errorResponse = { status: 400, statusText: 'Error on creationg a workspace' }
    createWorkspaceSpy.and.returnValue(throwError(() => errorResponse))
    spyOn(console, 'error')

    component.saveWorkspace()

    expect(messageErrorSpy).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.MESSAGE.CREATE.NOK' })
    expect(console.error).toHaveBeenCalledWith('createWorkspace', errorResponse)
  })

  it('should change fetchingLogoUrl on inputChange', () => {
    const event = {
      target: { value: 'newLogoValue' }
    } as unknown as Event

    component.inputChange(event)

    expect(component.fetchingLogoUrl).toBe('newLogoValue')
  })

  it('should change fetchingLogoUrl on inputChange: url value', () => {
    const url = 'https://host/path-to-assets/images/logo.svg'
    const event = {
      target: { value: url }
    } as unknown as Event
    component.formGroup.controls['name'].setValue('name')

    component.inputChange(event)

    expect(component.fetchingLogoUrl).toBe(url)
  })

  describe('onOpenProductPathes', () => {
    it('should load product urls', () => {
      const products = [{ baseUrl: '/productBaseUrl-1' }, { baseUrl: '/productBaseUrl-2' }]
      searchAvailableProductsSpy.and.returnValue(of({ stream: products }))

      component.onOpenProductPathes([])

      component.productPaths$.subscribe((paths) => {
        expect(paths).toEqual([products[0].baseUrl, products[1].baseUrl])
      })
    })

    it('should prevent loading product URLs again', () => {
      const paths = ['/productBaseUrl-1', '/productBaseUrl-2']

      component.onOpenProductPathes(paths)

      expect(searchAvailableProductsSpy).not.toHaveBeenCalled()
    })

    it('should load product paths failed', () => {
      const errorResponse = { status: 400, statusText: 'Error on loading product paths' }
      searchAvailableProductsSpy.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.onOpenProductPathes([])

      component.productPaths$.subscribe((paths) => {
        expect(paths).toEqual([])
        expect(console.error).toHaveBeenCalledWith('searchAvailableProducts', errorResponse)
      })
    })
  })

  describe('themes', () => {
    it('should get themes form rc emitter', (done) => {
      component.ngOnInit()

      component.themesEmitter.emit(themesOrg)

      component.themes$?.subscribe({
        next: (data) => {
          expect(data).toEqual(themesOrg)
          done()
        },
        error: done.fail
      })
    })
  })
})
