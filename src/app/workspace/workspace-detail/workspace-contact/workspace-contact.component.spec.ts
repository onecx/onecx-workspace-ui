import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, fakeAsync, waitForAsync } from '@angular/core/testing'
import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { FormControl, FormGroup } from '@angular/forms'

import { AppStateService, createTranslateLoader, PortalMessageService } from '@onecx/portal-integration-angular'
import { WorkspaceContactComponent } from 'src/app/workspace/workspace-detail/workspace-contact/workspace-contact.component'
import { Workspace } from 'src/app/shared/generated'

const portal: Workspace = {
  name: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url',
  id: 'id'
}

const formGroup = new FormGroup({
  country: new FormControl('country'),
  city: new FormControl('city'),
  postalCode: new FormControl('postalCode'),
  street: new FormControl('street'),
  streetNo: new FormControl('streetNo')
})

describe('WorkspaceContactComponent', () => {
  let component: WorkspaceContactComponent
  let fixture: ComponentFixture<WorkspaceContactComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceContactComponent],
      imports: [
        HttpClientTestingModule,
        TranslateModule.forRoot({
          isolate: true,
          loader: {
            provide: TranslateLoader,
            useFactory: createTranslateLoader,
            deps: [AppStateService, HttpClient]
          }
        })
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [{ provide: PortalMessageService, useValue: msgServiceSpy }]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspaceContactComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should disable formGroup if editMode false', () => {
    component.editMode = false
    component.formGroup = formGroup
    component.workspaceDetail = portal
    component.workspaceDetail.address = {
      country: 'detail country',
      city: 'detail city',
      postalCode: 'detail postalCode',
      street: 'detail street',
      streetNo: 'detail streetNo'
    }

    component.ngOnChanges()

    expect(component.formGroup.disabled).toBeTrue()
  })

  it('should setFormData onChanges: no address', () => {
    component.editMode = true
    component.formGroup = formGroup
    component.workspaceDetail = portal
    component.workspaceDetail.address = undefined

    component.ngOnChanges()

    expect(component.formGroup.controls['street'].value).toEqual(undefined)
  })

  it('should setFormData onChanges: address', () => {
    component.formGroup = formGroup
    component.workspaceDetail = portal
    component.workspaceDetail.address = {
      country: 'detail country',
      city: 'detail city',
      postalCode: 'detail postalCode',
      street: 'detail street',
      streetNo: 'detail streetNo'
    }

    component.ngOnChanges()

    expect(component.formGroup.controls['street'].value).toEqual('detail street')
  })

  it('should update portal onSubmit', () => {
    component.formGroup = new FormGroup({
      phoneNumber: new FormControl('123456789'),
      country: new FormControl('Some country'),
      city: new FormControl('Some city'),
      postalCode: new FormControl('12345'),
      street: new FormControl('Some street'),
      streetNo: new FormControl('123')
    })
    component.workspaceDetail = portal
    component.workspaceDetail.address = {
      country: 'detail country',
      city: 'detail city',
      postalCode: 'detail postalCode',
      street: 'detail street',
      streetNo: 'detail streetNo'
    }

    component.onSubmit()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.CHANGE_OK' })
  })

  it('should display error msg if update api call fails', fakeAsync(() => {
    component.formGroup = new FormGroup({
      phoneNumber: new FormControl('123456789'),
      country: new FormControl('Some country'),
      city: new FormControl('Some city'),
      postalCode: new FormControl('12345'),
      street: new FormControl('Some street'),
      streetNo: new FormControl('123')
    })
    component.workspaceDetail = portal
    component.workspaceDetail.address = {
      country: 'detail country',
      city: 'detail city',
      postalCode: 'detail postalCode',
      street: 'detail street',
      streetNo: 'detail streetNo'
    }

    component.onSubmit()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'ACTIONS.EDIT.MESSAGE.CHANGE_NOK'
    })
  }))

  xit('should display error msg if formGroup invalid', () => {
    const address = {}
    component.workspaceDetail = { ...portal, address: address }

    component.onSubmit()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'GENERAL.FORM_VALIDATION'
    })
  })

  it('should update portal onSubmit: no address', () => {
    const newPortal: Workspace = {
      name: 'name',
      theme: 'theme',
      baseUrl: '/some/base/url',
      id: 'id'
    }
    component.workspaceDetail = { ...newPortal, address: undefined }

    component.onSubmit()

    expect(component.workspaceDetail.address).toBeDefined()
  })
})
