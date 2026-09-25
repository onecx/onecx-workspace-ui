import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { EMPTY, of } from 'rxjs'

import { AppStateService } from '@onecx/angular-integration-interface'

import { ImageContainerComponent } from './image-container.component'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'

class MockAppStateService {
  currentMfe$ = of({
    remoteBaseUrl: '/base/'
  })
}

describe('ImageContainerComponent', () => {
  let component: ImageContainerComponent
  let fixture: ComponentFixture<ImageContainerComponent>

  function initTestComponent(): void {
    fixture = TestBed.createComponent(ImageContainerComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ImageContainerComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppStateService, useValue: new MockAppStateService() }
      ]
    }).compileComponents()
  }))

  beforeEach(() => {
    initTestComponent()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
    expect(component['defaultImageUrl']()).toBe('/base/assets/images/logo.png')
  })

  describe('on inputs', () => {
    it('should use imageUrl as URL when a valid imageUrl is set', () => {
      fixture.componentRef.setInput('imageUrl', 'https://host/path-to-image')
      fixture.detectChanges()

      expect(component.url()).toBe('https://host/path-to-image')
    })

    it('should use default URL when image URL is invalid', () => {
      fixture.componentRef.setInput('imageUrl', 'https://host')
      fixture.detectChanges()

      expect(component.url()).toBe(component['defaultImageUrl']())
    })

    it('should use bffUrl as URL when bffUrl is set', () => {
      fixture.componentRef.setInput('bffUrl', '/basePath/path-to-logo')
      fixture.detectChanges()

      expect(component.url()).toBe('/basePath/path-to-logo')
    })

    it('should use default URL when no URL is provided', () => {
      fixture.componentRef.setInput('imageUrl', undefined)
      fixture.componentRef.setInput('bffUrl', undefined)
      fixture.detectChanges()

      expect(component.url()).toBe(component['defaultImageUrl']())
    })
  })

  describe('loading results', () => {
    it('should emit a success when image could be loaded from non-default URL', () => {
      spyOn(component.imageLoadResult, 'emit')
      fixture.componentRef.setInput('bffUrl', '/bff-url')
      fixture.detectChanges()

      component.onImageLoadSuccess()

      expect(component.imageLoadResult.emit).toHaveBeenCalledWith(true)
    })

    it('should not emit on success when url is undefined', () => {
      spyOn(component.imageLoadResult, 'emit')
      component['_url'].set(undefined)

      component.onImageLoadSuccess()

      expect(component.imageLoadResult.emit).not.toHaveBeenCalled()
    })

    it('should not emit on success when url equals the default image url', () => {
      spyOn(component.imageLoadResult, 'emit')
      // After initTestComponent with no inputs, url() === defaultImageUrl()

      component.onImageLoadSuccess()

      expect(component.imageLoadResult.emit).not.toHaveBeenCalled()
    })

    it('should not emit on error when url is undefined', () => {
      spyOn(component.imageLoadResult, 'emit')
      component['_url'].set(undefined)

      component.onImageLoadError()

      expect(component.imageLoadResult.emit).not.toHaveBeenCalled()
    })

    it('should switch to bff URL and emit an error when external image could not be loaded', () => {
      spyOn(component.imageLoadResult, 'emit')
      fixture.componentRef.setInput('imageUrl', 'https://host/valid-image')
      fixture.componentRef.setInput('bffUrl', '/bff/url')
      fixture.detectChanges()

      component.onImageLoadError()

      expect(component.url()).toBe('/bff/url')
      expect(component['urlType']).toBe('bff-url')
      expect(component.imageLoadResult.emit).toHaveBeenCalledWith(false)
    })

    it('should switch to default URL and emit an error when external image could not be loaded and no bff URL', () => {
      spyOn(component.imageLoadResult, 'emit')
      fixture.componentRef.setInput('imageUrl', 'https://host/valid-image')
      fixture.componentRef.setInput('bffUrl', undefined)
      fixture.detectChanges()

      component.onImageLoadError()

      expect(component.url()).toBe(component['defaultImageUrl']())
      expect(component['urlType']).toBe('def-url')
      expect(component.imageLoadResult.emit).toHaveBeenCalledWith(false)
    })

    it('should switch to default URL and emit an error when cascade is disabled', () => {
      spyOn(component.imageLoadResult, 'emit')
      fixture.componentRef.setInput('imageUrl', 'https://host/valid-image')
      fixture.componentRef.setInput('cascadeUse', false)
      fixture.detectChanges()

      component.onImageLoadError()

      expect(component.url()).toBe(component['defaultImageUrl']())
      expect(component['urlType']).toBe('def-url')
      expect(component.imageLoadResult.emit).toHaveBeenCalledWith(false)
    })

    it('should switch to default URL and emit an error when bff image could not be loaded', () => {
      spyOn(component.imageLoadResult, 'emit')
      fixture.componentRef.setInput('bffUrl', '/bff/url')
      fixture.componentRef.setInput('imageUrl', undefined)
      fixture.detectChanges()

      component.onImageLoadError()

      expect(component.url()).toBe(component['defaultImageUrl']())
      expect(component['urlType']).toBe('def-url')
      expect(component.imageLoadResult.emit).toHaveBeenCalledWith(false)
    })
  })
})

describe('ImageContainerComponent without default image URL', () => {
  let component: ImageContainerComponent
  let fixture: ComponentFixture<ImageContainerComponent>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ImageContainerComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppStateService, useValue: { currentMfe$: EMPTY } }
      ]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageContainerComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should not cascade to default URL when no default image URL is available', () => {
    spyOn(component.imageLoadResult, 'emit')
    component['_url'].set('/bff/url')
    component['urlType'] = 'bff-url'

    component.onImageLoadError()

    expect(component.url()).toBe('/bff/url')
    expect(component['urlType']).toBe('bff-url')
    expect(component.imageLoadResult.emit).toHaveBeenCalledWith(false)
  })
})
