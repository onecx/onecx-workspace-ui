import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute, ActivatedRouteSnapshot, provideRouter, Router } from '@angular/router'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { ConfirmationService } from 'primeng/api'
import { DropdownModule } from 'primeng/dropdown'
import { of, throwError } from 'rxjs'

import { APP_CONFIG, PortalMessageService } from '@onecx/portal-integration-angular'

import { ProductAPIService, Workspace, WorkspaceAPIService } from 'src/app/shared/generated'
import { environment } from 'src/environments/environment'
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

class MockRouter {
  navigate = jasmine.createSpy('navigate')
}

describe('WorkspaceCreateComponent', () => {
  let component: WorkspaceCreateComponent
  let fixture: ComponentFixture<WorkspaceCreateComponent>
  const mockRouter = new MockRouter()

  const wApiServiceSpy = {
    createWorkspace: jasmine.createSpy('createWorkspace').and.returnValue(of({}))
  }
  const productServiceSpy = {
    searchAvailableProducts: jasmine.createSpy('searchAvailableProducts').and.returnValue(of({}))
  }
  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const mockActivatedRouteSnapshot: Partial<ActivatedRouteSnapshot> = { params: { id: 'mockId' } }
  const mockActivatedRoute: Partial<ActivatedRoute> = {
    snapshot: mockActivatedRouteSnapshot as ActivatedRouteSnapshot
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceCreateComponent],
      imports: [
        ReactiveFormsModule,
        DropdownModule,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClientTesting(),
        provideHttpClient(),
        provideRouter([{ path: '', component: WorkspaceCreateComponent }]),
        { provide: APP_CONFIG, useValue: environment },
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceAPIService, useValue: wApiServiceSpy },
        { provide: ProductAPIService, useValue: productServiceSpy },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter },
        ConfirmationService
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspaceCreateComponent)
    component = fixture.componentInstance
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

  afterEach(() => {
    wApiServiceSpy.createWorkspace.calls.reset()
    productServiceSpy.searchAvailableProducts.calls.reset()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should create a workspace', () => {
    wApiServiceSpy.createWorkspace.and.returnValue(of({ resource: workspace }))

    component.saveWorkspace()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.MESSAGE.CREATE_OK' })
    expect(mockRouter.navigate).toHaveBeenCalledWith(['./name'], { relativeTo: mockActivatedRoute })
  })

  it('should display error when workspace creation fails', () => {
    const errorResponse = { status: 400, statusText: 'Error on creationg a workspace' }
    wApiServiceSpy.createWorkspace.and.returnValue(throwError(() => errorResponse))
    spyOn(console, 'error')

    component.saveWorkspace()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.MESSAGE.CREATE_NOK' })
    expect(console.error).toHaveBeenCalledWith('createWorkspace', errorResponse)
  })

  it('should change fetchingLogoUrl on inputChange: valid value', fakeAsync(() => {
    const event = {
      target: { value: 'newLogoValue' }
    } as unknown as Event

    component.inputChange(event)

    tick(1000)

    expect(component.fetchingLogoUrl).toBe('newLogoValue')
  }))

  it('should change fetchingLogoUrl on inputChange: empty value', fakeAsync(() => {
    const url = 'https://host/path-to-assets/images/logo.svg'
    const event = {
      target: { value: url }
    } as unknown as Event
    component.formGroup.controls['name'].setValue('name')

    component.inputChange(event)

    tick(1000)

    expect(component.fetchingLogoUrl).toBe(url)
  }))

  describe('onOpenProductPathes', () => {
    it('should load product urls', () => {
      const products = [{ baseUrl: '/productBaseUrl-1' }, { baseUrl: '/productBaseUrl-2' }]
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: products }))

      component.onOpenProductPathes([])

      component.productPaths$.subscribe((paths) => {
        expect(paths).toEqual([products[0].baseUrl, products[1].baseUrl])
      })
    })

    it('should prevent loading product URLs again', () => {
      const paths = ['/productBaseUrl-1', '/productBaseUrl-2']

      component.onOpenProductPathes(paths)
    })

    it('should load product paths failed', () => {
      const errorResponse = { status: 400, statusText: 'Error on loading product paths' }
      productServiceSpy.searchAvailableProducts.and.returnValue(throwError(() => errorResponse))
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
