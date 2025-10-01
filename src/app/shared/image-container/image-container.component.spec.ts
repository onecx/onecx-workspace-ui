import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of } from 'rxjs'

import { AppStateService } from '@onecx/angular-integration-interface'

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
      schemas: [NO_ERRORS_SCHEMA],
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
  })

  it('should set defaultImageUrl$ to the correct value', (done) => {
    const expectedUrl = '/base/assets/images/workspace.png'

    component.defaultImageUrl$.subscribe((url) => {
      expect(url).toBe(expectedUrl)
      done()
    })
  })

  describe('loading results', () => {
    it('should emit an error if image could not be loaded', () => {
      spyOn(component.imageLoadResult, 'emit')

      component.imageUrl = '/url'
      component.onImageLoadError()

      expect(component.imageLoadResult.emit).toHaveBeenCalledWith(false)
    })

    it('should emit a success if image could be loaded', () => {
      spyOn(component.imageLoadResult, 'emit')

      component.imageUrl = '/url'
      component.onImageLoadSuccess()

      expect(component.imageLoadResult.emit).toHaveBeenCalledWith(true)
    })
  })
})
