import { NO_ERRORS_SCHEMA } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing'
import { TranslateModule, TranslateLoader } from '@ngx-translate/core'
import { ReactiveFormsModule } from '@angular/forms'
import { RouterTestingModule } from '@angular/router/testing'
import { Router } from '@angular/router'
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router'
import { ConfirmationService } from 'primeng/api'
import { DropdownModule } from 'primeng/dropdown'

import { ImagesInternalAPIService, Workspace, WorkspaceAPIService } from 'src/app/shared/generated'
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
  baseUrl: '/some/base/url'
}

class MockRouter {
  navigate = jasmine.createSpy('navigate')
}

fdescribe('WorkspaceCreateComponent', () => {
  let component: WorkspaceCreateComponent
  let fixture: ComponentFixture<WorkspaceCreateComponent>
  let mockRouter = new MockRouter()
  let mockActivatedRoute: Partial<ActivatedRoute>

  const wApiServiceSpy = {
    getAllThemes: jasmine.createSpy('getAllThemes').and.returnValue(of({})),
    createWorkspace: jasmine.createSpy('createWorkspace').and.returnValue(of({}))
  }
  const imageServiceSpy = {
    getImage: jasmine.createSpy('getImage').and.returnValue(of({})),
    updateImage: jasmine.createSpy('updateImage').and.returnValue(of({})),
    uploadImage: jasmine.createSpy('uploadImage').and.returnValue(of({})),
    configuration: {
      basePath: 'basepath'
    }
  }
  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'info', 'error'])
  const mockActivatedRouteSnapshot: Partial<ActivatedRouteSnapshot> = {
    params: {
      id: 'mockId'
    }
  }
  mockActivatedRoute = {
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
        { provide: ImagesInternalAPIService, useValue: imageServiceSpy },
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
    fixture.detectChanges()
  })

  afterEach(() => {
    wApiServiceSpy.getAllThemes.calls.reset()
    wApiServiceSpy.createWorkspace.calls.reset()
    imageServiceSpy.getImage.calls.reset()
    imageServiceSpy.updateImage.calls.reset()
    imageServiceSpy.uploadImage.calls.reset()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.info.calls.reset()
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
    wApiServiceSpy.createWorkspace.and.returnValue(throwError(() => new Error()))

    component.saveWorkspace()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.MESSAGE.CREATE_NOK' })
  })

  it('should not upload a file if productName is empty', () => {
    const event = {
      target: {
        files: ['file']
      }
    }
    component.formGroup.controls['name'].setValue('')

    component.onFileUpload(event as any, 'logo')

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'IMAGE.UPLOAD_FAIL'
    })
  })

  it('should not upload a file if productName is null', () => {
    const event = {
      target: {
        files: ['file']
      }
    }
    component.formGroup.controls['name'].setValue(null)

    component.onFileUpload(event as any, 'logo')

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'IMAGE.UPLOAD_FAIL'
    })
  })

  it('should not upload a file that is too large', () => {
    const largeBlob = new Blob(['a'.repeat(120000)], { type: 'image/png' })
    const largeFile = new File([largeBlob], 'test.png', { type: 'image/png' })
    const event = {
      target: {
        files: [largeFile]
      }
    }
    component.formGroup.controls['name'].setValue('name')

    component.onFileUpload(event as any, 'logo')

    expect(component.formGroup.valid).toBeFalse()
  })

  it('should not upload a file that is too large', () => {
    const largeBlob = new Blob(['a'.repeat(120000)], { type: 'image/png' })
    const largeFile = new File([largeBlob], 'test.png', { type: 'image/png' })
    const event = {
      target: {
        files: [largeFile]
      }
    }
    component.formGroup.controls['name'].setValue('name')

    component.onFileUpload(event as any, 'logo')

    expect(component.formGroup.valid).toBeFalse()
  })

  it('should upload a file', () => {
    imageServiceSpy.updateImage.and.returnValue(of({}))
    const blob = new Blob(['a'.repeat(10)], { type: 'image/png' })
    const file = new File([blob], 'test.png', { type: 'image/png' })
    const event = {
      target: {
        files: [file]
      }
    }

    component.formGroup.controls['name'].setValue('name')
    component.formGroup.controls['logoUrl'].setValue('url')

    component.onFileUpload(event as any, 'logo')

    expect(msgServiceSpy.info).toHaveBeenCalledWith({
      summaryKey: 'IMAGE.UPLOAD_SUCCESS'
    })
  })

  it('should display error if upload fails', () => {
    imageServiceSpy.getImage.and.returnValue(throwError(() => new Error()))
    const blob = new Blob(['a'.repeat(10)], { type: 'image/png' })
    const file = new File([blob], 'test.png', { type: 'image/png' })
    const event = {
      target: {
        files: [file]
      }
    }
    component.formGroup.controls['name'].setValue('name')
    component.formGroup.controls['logoUrl'].setValue('url')

    component.onFileUpload(event as any, 'logo')

    expect(msgServiceSpy.info).toHaveBeenCalledWith({
      summaryKey: 'IMAGE.UPLOAD_SUCCESS'
    })
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
    const event = {
      target: { value: '' }
    } as unknown as Event
    component.formGroup.controls['name'].setValue('name')

    component.inputChange(event)

    tick(1000)

    expect(component.fetchingLogoUrl).toBe('basepath/images/name/logo')
  }))
})
