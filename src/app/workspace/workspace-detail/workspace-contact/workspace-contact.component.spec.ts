import { NO_ERRORS_SCHEMA } from '@angular/core'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideRouter } from '@angular/router'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { FormControl, FormGroup } from '@angular/forms'
import { TranslateTestingModule } from 'ngx-translate-testing'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { Workspace } from 'src/app/shared/generated'
import { WorkspaceContactComponent } from './workspace-contact.component'

const portal: Workspace = {
  name: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url',
  id: 'id',
  displayName: ''
}

const contactForm = new FormGroup({
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
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClientTesting(),
        provideHttpClient(),
        provideRouter([{ path: '', component: WorkspaceContactComponent }]),
        { provide: PortalMessageService, useValue: msgServiceSpy }
      ]
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

  it('should disable contactForm if editMode false', () => {
    component.editMode = false
    component.contactForm = contactForm
    component.workspace = portal
    component.workspace.address = {
      country: 'detail country',
      city: 'detail city',
      postalCode: 'detail postalCode',
      street: 'detail street',
      streetNo: 'detail streetNo'
    }

    component.ngOnChanges()

    expect(component.contactForm.disabled).toBeTrue()
  })

  it('should fillForm onChanges: no address', () => {
    component.editMode = true
    component.contactForm = contactForm
    component.workspace = portal
    component.workspace.address = undefined

    component.ngOnChanges()

    expect(component.contactForm.controls['street'].value).toEqual(undefined)
  })

  it('should fillForm onChanges: address', () => {
    component.contactForm = contactForm
    component.workspace = portal
    component.workspace.address = {
      country: 'detail country',
      city: 'detail city',
      postalCode: 'detail postalCode',
      street: 'detail street',
      streetNo: 'detail streetNo'
    }

    component.ngOnChanges()

    expect(component.contactForm.controls['street'].value).toEqual('detail street')
  })

  it('should update portal onSave', () => {
    component.contactForm = new FormGroup({
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
      id: 'id',
      displayName: ''
    }
    component.workspace = { ...newPortal, address: undefined }

    component.onSave()

    expect(component.workspace.address).toBeDefined()
  })
})
