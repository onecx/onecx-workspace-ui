import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'

import { WorkspaceSlotDeregistrationComponent } from './workspace-slot-deregistration.component'

describe('WorkspaceSlotDeregistrationComponent', () => {
  let component: WorkspaceSlotDeregistrationComponent
  let fixture: ComponentFixture<WorkspaceSlotDeregistrationComponent>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        WorkspaceSlotDeregistrationComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [provideNoopAnimations()]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspaceSlotDeregistrationComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should not be visible by default', () => {
    expect(component.visible()).toBeFalse()
  })

  it('should emit confirm when onConfirm is called', () => {
    const confirmSpy = jasmine.createSpy('confirm')
    component.confirm.subscribe(confirmSpy)

    component.onConfirm()

    expect(confirmSpy).toHaveBeenCalled()
  })

  it('should emit closeDialog when onClose is called', () => {
    const closeSpy = jasmine.createSpy('closeDialog')
    component.closeDialog.subscribe(closeSpy)

    component.onClose()

    expect(closeSpy).toHaveBeenCalled()
  })

  it('should render the dialog when visible is true', () => {
    fixture.componentRef.setInput('visible', true)
    fixture.detectChanges()

    expect(document.getElementById('ws_slot_deregister_message')).toBeTruthy()
  })
})
