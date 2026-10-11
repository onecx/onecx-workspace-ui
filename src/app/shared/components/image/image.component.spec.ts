import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { EMPTY, of } from 'rxjs'

import { AppStateService } from '@onecx/angular-integration-interface'

import { RefType } from 'src/app/shared/generated'

import { ImageComponent, image } from './image.component'

class MockAppStateService {
  currentMfe$ = of({
    remoteBaseUrl: '/base/'
  })
}

// minimal valid image input: imageType + refType are required
const baseImage: image = { imageType: 'workspace', refType: RefType.Logo }

describe('ImageComponent', () => {
  let component: ImageComponent
  let fixture: ComponentFixture<ImageComponent>

  function initTestComponent(): void {
    fixture = TestBed.createComponent(ImageComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ImageComponent,
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
    expect(component['defaultImageUrl']()).toBe('/base/assets/images/workspace.png')
  })

  describe('on inputs', () => {
    it('should use the external url when a valid url is provided', () => {
      fixture.componentRef.setInput('item', { ...baseImage, url: 'https://host/path-to-image' })
      fixture.detectChanges()

      expect(component.url()).toBe('https://host/path-to-image')
    })

    it('should use default URL when the url is invalid', () => {
      fixture.componentRef.setInput('item', { ...baseImage, url: 'https://host' })
      fixture.detectChanges()

      expect(component.url()).toBe(component['defaultImageUrl']())
    })

    it('should use bffUrl as URL when bffUrl is set', () => {
      fixture.componentRef.setInput('item', { ...baseImage, bffUrl: '/basePath/path-to-logo' })
      fixture.detectChanges()

      expect(component.url()).toBe('/basePath/path-to-logo')
    })

    it('should use default URL when no URL is provided', () => {
      fixture.componentRef.setInput('item', { ...baseImage })
      fixture.detectChanges()

      expect(component.url()).toBe(component['defaultImageUrl']())
    })

    it('should use the product default image when the item imageType is product', () => {
      fixture.componentRef.setInput('item', { ...baseImage, imageType: 'product' })
      fixture.detectChanges()

      expect(component['defaultImageUrl']()).toBe('/base/assets/images/product.png')
    })
  })

  describe('loading results', () => {
    it('should emit a success when image could be loaded from non-default URL', () => {
      spyOn(component.imageLoadResult, 'emit')
      fixture.componentRef.setInput('item', { ...baseImage, bffUrl: '/bff-url' })
      fixture.detectChanges()

      component.onImageLoadSuccess()

      expect(component.imageLoadResult.emit).toHaveBeenCalledWith(true)
    })

    it('should not emit on success when url is undefined', () => {
      spyOn(component.imageLoadResult, 'emit')
      // no item set => url() is undefined

      component.onImageLoadSuccess()

      expect(component.imageLoadResult.emit).not.toHaveBeenCalled()
    })

    it('should not emit on success when url equals the default image url', () => {
      spyOn(component.imageLoadResult, 'emit')
      // item without url/bffUrl => url() === defaultImageUrl()
      fixture.componentRef.setInput('item', { ...baseImage })
      fixture.detectChanges()

      component.onImageLoadSuccess()

      expect(component.imageLoadResult.emit).not.toHaveBeenCalled()
    })

    it('should not emit on error when url is undefined', () => {
      spyOn(component.imageLoadResult, 'emit')
      // no item set => url() is undefined

      component.onImageLoadError()

      expect(component.imageLoadResult.emit).not.toHaveBeenCalled()
    })

    it('should switch to bff URL and emit an error when external image could not be loaded', () => {
      spyOn(component.imageLoadResult, 'emit')
      fixture.componentRef.setInput('item', {
        ...baseImage,
        url: 'https://host/valid-image',
        bffUrl: '/bff/url'
      })
      fixture.detectChanges()

      component.onImageLoadError()

      expect(component.urlNext()).toBe('/bff/url')
      expect(component['urlType']).toBe('bff-url')
      expect(component.imageLoadResult.emit).toHaveBeenCalledWith(false)
    })

    it('should switch to default URL and emit an error when external image could not be loaded and no bff URL', () => {
      spyOn(component.imageLoadResult, 'emit')
      fixture.componentRef.setInput('item', { ...baseImage, url: 'https://host/valid-image' })
      fixture.detectChanges()

      component.onImageLoadError()

      expect(component.urlNext()).toBe(component['defaultImageUrl']())
      expect(component['urlType']).toBe('def-url')
      expect(component.imageLoadResult.emit).toHaveBeenCalledWith(false)
    })

    it('should switch to default URL and emit an error when cascade is disabled', () => {
      spyOn(component.imageLoadResult, 'emit')
      fixture.componentRef.setInput('item', { ...baseImage, url: 'https://host/valid-image' })
      fixture.componentRef.setInput('cascadeUse', false)
      fixture.detectChanges()

      component.onImageLoadError()

      expect(component.urlNext()).toBe(component['defaultImageUrl']())
      expect(component['urlType']).toBe('def-url')
      expect(component.imageLoadResult.emit).toHaveBeenCalledWith(false)
    })

    it('should switch to default URL and emit an error when bff image could not be loaded', () => {
      spyOn(component.imageLoadResult, 'emit')
      fixture.componentRef.setInput('item', { ...baseImage, bffUrl: '/bff/url' })
      fixture.detectChanges()

      component.onImageLoadError()

      expect(component.urlNext()).toBe(component['defaultImageUrl']())
      expect(component['urlType']).toBe('def-url')
      expect(component.imageLoadResult.emit).toHaveBeenCalledWith(false)
    })
  })
})

describe('ImageComponent without default image URL', () => {
  let component: ImageComponent
  let fixture: ComponentFixture<ImageComponent>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ImageComponent,
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
    fixture = TestBed.createComponent(ImageComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should not cascade to default URL when no default image URL is available', () => {
    spyOn(component.imageLoadResult, 'emit')
    fixture.componentRef.setInput('item', { ...baseImage, bffUrl: '/bff/url' })
    fixture.componentRef.setInput('logEnabled', true)
    fixture.detectChanges()

    component.onImageLoadError()

    // no default url available => url stays the failing bff url, urlType unchanged
    expect(component.url()).toBe('/bff/url')
    expect(component['urlType']).toBe('bff-url')
    expect(component.imageLoadResult.emit).toHaveBeenCalledWith(false)
  })
})
