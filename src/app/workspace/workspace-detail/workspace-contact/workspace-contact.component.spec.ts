import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { FormControl, FormGroup } from '@angular/forms'

import { PortalMessageService } from '@onecx/portal-integration-angular'
import { Workspace } from 'src/app/shared/generated'
import { WorkspaceContactComponent } from './workspace-contact.component'
import { RouterTestingModule } from '@angular/router/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'

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
        RouterTestingModule,
        HttpClientTestingModule,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
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
    component.workspace = portal
    component.workspace.address = {
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
    component.workspace = portal
    component.workspace.address = undefined

    component.ngOnChanges()

    expect(component.formGroup.controls['street'].value).toEqual(undefined)
  })

  it('should setFormData onChanges: address', () => {
    component.formGroup = formGroup
    component.workspace = portal
    component.workspace.address = {
      country: 'detail country',
      city: 'detail city',
      postalCode: 'detail postalCode',
      street: 'detail street',
      streetNo: 'detail streetNo'
    }

    component.ngOnChanges()

    expect(component.formGroup.controls['street'].value).toEqual('detail street')
  })

  it('should update portal onSave', () => {
    component.formGroup = new FormGroup({
      phoneNumber: new FormControl('123456789'),
      country: new FormControl('Some country'),
      city: new FormControl('Some city'),
      postalCode: new FormControl('12345'),
      street: new FormControl('Some street'),
      streetNo: new FormControl('123')
    })
    component.workspace = portal
    component.workspace.address = {
      country: 'detail country',
      city: 'detail city',
      postalCode: 'detail postalCode',
      street: 'detail street',
      streetNo: 'detail streetNo'
    }

    component.onSave()

    expect(component.editMode).toBeFalse()
  })

  it('should update portal onSave: no address', () => {
    const newPortal: Workspace = {
      name: 'name',
      theme: 'theme',
      baseUrl: '/some/base/url',
      id: 'id'
    }
    component.workspace = { ...newPortal, address: undefined }

    component.onSave()

    expect(component.workspace.address).toBeDefined()
  })
})
