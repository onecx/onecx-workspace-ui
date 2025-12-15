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

const workspace: Workspace = {
  id: 'id',
  name: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url',
  displayName: 'Display Name'
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
    component.workspace = workspace
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
    component.workspace = workspace
    component.workspace.address = undefined

    component.ngOnChanges()

    expect(component.contactForm.controls['street'].value).toEqual(undefined)
  })

  it('should fillForm onChanges: address', () => {
    component.contactForm = contactForm
    component.workspace = workspace
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

  it('should update workspace onSave', () => {
    component.contactForm = new FormGroup({
      phoneNumber: new FormControl('123456789'),
      country: new FormControl('Some country'),
      city: new FormControl('Some city'),
      postalCode: new FormControl('12345'),
      street: new FormControl('Some street'),
      streetNo: new FormControl('123')
    })
    component.workspace = workspace
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

  it('should update workspace onSave: no address', () => {
    component.workspace = workspace

    component.onSave()

    expect(component.workspace.address).toBeDefined()
  })

  it('should display error msg if form is invalid', () => {
    component.workspace = undefined

    component.onSave()

    expect().nothing()
  })

  it('should display error msg if form is invalid', () => {
    component.editMode = true
    component.workspace = workspace
    component.workspace.address = {}

    component.ngOnChanges()
    component.contactForm.controls['street'].setValue(
      '89_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_'
    )

    component.onSave()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'VALIDATION.FORM_INVALID' })
  })
})
