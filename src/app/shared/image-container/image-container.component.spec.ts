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

  function initTestComponent(): void {
    fixture = TestBed.createComponent(ImageContainerComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

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
    initTestComponent()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
    expect(component['defaultImageUrl']).toBe('/base/assets/images/workspace.png')
  })

  describe('on changes', () => {
    it('should use imageUrl as URL if was set', () => {
      component.imageUrl = 'https://host/path-to-image'

      component.ngOnChanges()

      expect(component.url).toBe(component.imageUrl)
    })

    it('should use default URL if image URL is invalid', () => {
      component.imageUrl = 'https://host'

      component.ngOnChanges()

      expect(component.url).toBe(component['defaultImageUrl'])
    })

    it('should use imageUrl as URL if was set', () => {
      component.bffUrl = '/basePath/path-to-logo'

      component.ngOnChanges()

      expect(component.url).toBe(component.bffUrl)
    })

    it('should use default URL if no URL is provided', () => {
      component.imageUrl = undefined
      component.bffUrl = undefined

      component.ngOnChanges()

      expect(component.url).toBe(component['defaultImageUrl'])
    })
  })

  describe('loading results', () => {
    it('should emit a success if image could be loaded', () => {
      spyOn(component.imageLoadResult, 'emit')

      component.url = '/bff-url'
      component.onImageLoadSuccess()

      expect(component.imageLoadResult.emit).toHaveBeenCalledWith(true)
    })

    it('should use bff URL and emit an error if external image could not be loaded', () => {
      spyOn(component.imageLoadResult, 'emit')

      component.url = '/external/url'
      component['urlType'] === 'ext-url'
      component.bffUrl = '/bff/url'

      component.onImageLoadError()

      expect(component.url).toBe(component.bffUrl)
      expect(component['urlType']).toBe('bff-url')
      expect(component.imageLoadResult.emit).toHaveBeenCalledWith(false)
    })

    it('should use default URL and emit an error if external image could not be loaded and no bff URL', () => {
      spyOn(component.imageLoadResult, 'emit')

      component['defaultImageUrl'] = 'default-url'
      component.url = '/external/url'
      component['urlType'] === 'ext-url'
      component.bffUrl = undefined

      component.onImageLoadError()

      expect(component.url).toBe(component['defaultImageUrl'])
      expect(component['urlType']).toBe('def-url')
      expect(component.imageLoadResult.emit).toHaveBeenCalledWith(false)
    })

    it('should use default URL and emit an error if bff image could not be loaded', () => {
      spyOn(component.imageLoadResult, 'emit')

      component.url = '/bff/url'
      component['urlType'] = 'bff-url'
      component['defaultImageUrl'] = '/default/url'

      component.onImageLoadError()

      expect(component.url).toBe(component['defaultImageUrl'])
      expect(component['urlType']).toBe('def-url')
      expect(component.imageLoadResult.emit).toHaveBeenCalledWith(false)
    })
  })
})
