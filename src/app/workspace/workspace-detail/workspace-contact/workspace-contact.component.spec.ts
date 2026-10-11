import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { FormControl, FormGroup } from '@angular/forms'
import { provideRouter } from '@angular/router'
import { TranslateTestingModule } from 'ngx-translate-testing'

import { Workspace } from 'src/app/shared/generated'
import { WorkspaceContactComponent } from './workspace-contact.component'

const workspace: Workspace = {
  id: 'id',
  name: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url',
  displayName: 'Display Name'
}

// Fresh form per test: the previous shared instance was mutated by fillForm() across tests
// (leak). Controls start null, mirroring the component's real form.
function createContactForm(): FormGroup {
  return new FormGroup({
    companyName: new FormControl(null),
    phoneNumber: new FormControl(null),
    country: new FormControl(null),
    city: new FormControl(null),
    postalCode: new FormControl(null),
    street: new FormControl(null),
    streetNo: new FormControl(null)
  })
}

describe('WorkspaceContactComponent', () => {
  let component: WorkspaceContactComponent
  let fixture: ComponentFixture<WorkspaceContactComponent>

  // PortalMessageService is providedIn 'any', so the component injects its own instance and a
  // root-level provider would be shadowed - spy on the actual instance the component holds.
  let msgServiceSpy: { success: jasmine.Spy; error: jasmine.Spy }

  function initializeComponent(): void {
    fixture = TestBed.createComponent(WorkspaceContactComponent)
    component = fixture.componentInstance
    fixture.detectChanges()

    msgServiceSpy = {
      success: spyOn(component['msgService'], 'success'),
      error: spyOn(component['msgService'], 'error')
    }
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        WorkspaceContactComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '', component: WorkspaceContactComponent }])
      ]
    }).compileComponents()
  }))

  beforeEach(() => {
    initializeComponent()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should disable contactForm if editMode false', () => {
    component.editMode = false
    component.contactForm = createContactForm()
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
    component.contactForm = createContactForm()
    component.workspace = workspace
    component.workspace.address = undefined

    component.ngOnChanges()

    expect(component.contactForm.controls['street'].value).toBeNull()
  })

  it('should fillForm onChanges: address', () => {
    component.contactForm = createContactForm()
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

  it('should fillForm onChanges: top-level companyName and phoneNumber', () => {
    // companyName / phoneNumber are read from the workspace itself (not from address), so a fresh
    // workspace carrying those top-level fields exercises the `else if (workspace[key])` branch.
    component.contactForm = createContactForm()
    component.workspace = { ...workspace, companyName: 'Some Company', phoneNumber: '123456789' }

    component.ngOnChanges()

    expect(component.contactForm.controls['companyName'].value).toEqual('Some Company')
    expect(component.contactForm.controls['phoneNumber'].value).toEqual('123456789')
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

  it('should do nothing onSave when workspace is undefined', () => {
    component.workspace = undefined

    component.onSave()

    expect().nothing()
  })

  it('should display error msg if form is invalid', () => {
    component.editMode = true
    component.workspace = workspace
    component.workspace.address = {}

    component.ngOnChanges()

    // street validator is maxLength(255): a 256-char value makes the form invalid
    component.contactForm.controls['street'].setValue('x'.repeat(256))

    component.onSave()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'VALIDATION.FORM_INVALID' })
  })
})
