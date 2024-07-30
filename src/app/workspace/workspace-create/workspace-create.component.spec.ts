import { NO_ERRORS_SCHEMA } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing'
import { TranslateModule, TranslateLoader } from '@ngx-translate/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { RouterTestingModule } from '@angular/router/testing'
import { Router } from '@angular/router'
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router'
import { ConfirmationService } from 'primeng/api'
import { DropdownModule } from 'primeng/dropdown'

import { ProductAPIService, Workspace, WorkspaceAPIService } from 'src/app/shared/generated'
import { environment } from 'src/environments/environment'
import {
  APP_CONFIG,
  AppStateService,
  createTranslateLoader,
  PortalMessageService
} from '@onecx/portal-integration-angular'
import { WorkspaceCreateComponent } from './workspace-create.component'
import { of, throwError } from 'rxjs'

const workspace: Workspace = {
  id: 'id',
  name: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url',
  homePage: '/homepage',
  displayName: ''
}

class MockRouter {
  navigate = jasmine.createSpy('navigate')
}

describe('WorkspaceCreateComponent', () => {
  let component: WorkspaceCreateComponent
  let fixture: ComponentFixture<WorkspaceCreateComponent>
  const mockRouter = new MockRouter()

  const wApiServiceSpy = {
    getAllThemes: jasmine.createSpy('getAllThemes').and.returnValue(of(['theme1', 'theme2'])),
    createWorkspace: jasmine.createSpy('createWorkspace').and.returnValue(of({}))
  }
  const productServiceSpy = {
    searchAvailableProducts: jasmine.createSpy('searchAvailableProducts').and.returnValue(of({}))
  }
  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'info', 'error'])
  const mockActivatedRouteSnapshot: Partial<ActivatedRouteSnapshot> = {
    params: {
      id: 'mockId'
    }
  }
  const mockActivatedRoute: Partial<ActivatedRoute> = {
    snapshot: mockActivatedRouteSnapshot as ActivatedRouteSnapshot
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceCreateComponent],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        ReactiveFormsModule,
        DropdownModule,
        TranslateModule.forRoot({
          isolate: true,
          loader: {
            provide: TranslateLoader,
            useFactory: createTranslateLoader,
            deps: [HttpClient, AppStateService]
          }
        })
      ],
      providers: [
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
    wApiServiceSpy.getAllThemes.calls.reset()
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
    wApiServiceSpy.getAllThemes.calls.reset()
    wApiServiceSpy.createWorkspace.calls.reset()
    productServiceSpy.searchAvailableProducts.calls.reset()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.info.calls.reset()
    msgServiceSpy.error.calls.reset()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('loadMfeUrls', () => {
    it('should load product urls on init', () => {
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: [{ baseUrl: 'baseUrl' }] }))
      component.mfeRList = []

      component.ngOnInit()

      expect(component.mfeRList).toContain('baseUrl')
    })

    it('should log error if api call fails', () => {
      const err = { error: 'error' }
      productServiceSpy.searchAvailableProducts.and.returnValue(throwError(() => err))
      spyOn(console, 'error')

      component.ngOnInit()

      expect(console.error).toHaveBeenCalledWith('getProductsByWorkspaceId():', err)
    })
  })

  it('should create a workspace', () => {
    wApiServiceSpy.createWorkspace.and.returnValue(of({ resource: workspace }))

    component.saveWorkspace()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.MESSAGE.CREATE_OK' })
    expect(mockRouter.navigate).toHaveBeenCalledWith(['./name'], { relativeTo: mockActivatedRoute })
  })

  it('should display error when workspace creation fails', () => {
    wApiServiceSpy.createWorkspace.and.returnValue(throwError(() => new Error()))

    component.saveWorkspace()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.MESSAGE.CREATE_NOK' })
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
    const url = 'https://www.capgemini.com/wp-content/themes/capgemini-komposite/assets/images/logo.svg'
    const event = {
      target: { value: url }
    } as unknown as Event
    component.formGroup.controls['name'].setValue('name')

    component.inputChange(event)

    tick(1000)

    expect(component.fetchingLogoUrl).toBe(url)
  }))
})
