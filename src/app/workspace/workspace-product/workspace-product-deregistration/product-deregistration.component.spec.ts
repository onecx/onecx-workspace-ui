import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'

import { ProductDeregistrationComponent } from './product-deregistration.component'

describe('ProductDeregistrationComponent', () => {
  let component: ProductDeregistrationComponent
  let fixture: ComponentFixture<ProductDeregistrationComponent>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ProductDeregistrationComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [provideNoopAnimations()]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(ProductDeregistrationComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should emit confirm on onConfirm', () => {
    const confirmSpy = jasmine.createSpy('confirm')
    component.confirm.subscribe(confirmSpy)

    component.onConfirm()

    expect(confirmSpy).toHaveBeenCalled()
  })

  it('should emit closeDialog on onClose', () => {
    const closeSpy = jasmine.createSpy('closeDialog')
    component.closeDialog.subscribe(closeSpy)

    component.onClose()

    expect(closeSpy).toHaveBeenCalled()
  })

  it('should default to not visible', () => {
    expect(component.visible).toBeFalse()
  })
})
