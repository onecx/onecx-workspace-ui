import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of } from 'rxjs'

import { AppStateService } from '@onecx/portal-integration-angular'
import { ImageContainerComponent } from './image-container.component'

class MockAppStateService {
  currentMfe$ = of({
    remoteBaseUrl: '/base/'
  })
}

describe('ImageContainerComponent', () => {
  let component: ImageContainerComponent
  let fixture: ComponentFixture<ImageContainerComponent>
  let mockAppStateService: MockAppStateService

  beforeEach(waitForAsync(() => {
    mockAppStateService = new MockAppStateService()

    TestBed.configureTestingModule({
      declarations: [ImageContainerComponent],
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [{ provide: AppStateService, useValue: mockAppStateService }]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageContainerComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
    expect(component.defaultImageUrl).toEqual('/base/assets/images/logo.png')
  })

  describe('ngOnChanges', () => {
    it('should not modify imageUrl if it starts with http/https', () => {
      const testUrl = 'http://path/to/image.jpg'
      component.imageUrl = testUrl
      component.ngOnChanges({
        imageUrl: {
          currentValue: testUrl,
          previousValue: null,
          firstChange: true,
          isFirstChange: () => true
        }
      })

      expect(component.imageUrl).toBe(testUrl)
    })
  })

  it('onImageError should set displayDefaultLogo to true', () => {
    component.onImageError()

    expect(component.displayDefaultLogo).toBeTrue()
  })
})
