import { NO_ERRORS_SCHEMA } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideRouter } from '@angular/router'
import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, throwError } from 'rxjs'

import { ConfigurationService, PortalMessageService, ThemeService } from '@onecx/portal-integration-angular'
import { WorkspaceService } from '@onecx/angular-integration-interface'
import * as Accelerator from '@onecx/accelerator'

import { WorkspacePropsComponent } from 'src/app/workspace/workspace-detail/workspace-props/workspace-props.component'
import {
  WorkspaceAPIService,
  ImagesInternalAPIService,
  Workspace,
  WorkspaceProductAPIService
} from 'src/app/shared/generated'
import * as utils from 'src/app/shared/utils'

const workspace = {
  id: 'id',
  disabled: false,
  name: 'name',
  displayName: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url',
  homePage: '/welcome',
  logoUrl: 'https://host:port/site/logo.png'
}

const formGroup = new FormGroup({
  displayName: new FormControl('displayName', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
  theme: new FormControl('theme', [Validators.required]),
  baseUrl: new FormControl('/url', [Validators.required, Validators.minLength(1), Validators.pattern('^/.*')])
})

describe('WorkspacePropsComponent', () => {
  let component: WorkspacePropsComponent
  let fixture: ComponentFixture<WorkspacePropsComponent>
  const workspaceServiceMock: jasmine.SpyObj<WorkspaceService> = jasmine.createSpyObj('WorkspaceService', [
    'doesUrlExistFor',
    'getUrl'
  ])
  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'info', 'error'])
  const apiServiceSpy = {
    updateWorkspace: jasmine.createSpy('updateWorkspace').and.returnValue(of([])),
    getAllThemes: jasmine.createSpy('getAllThemes').and.returnValue(of([]))
  }
  const themeAPIServiceSpy = {
    getThemes: jasmine.createSpy('getThemes').and.returnValue(of({})),
    getThemeById: jasmine.createSpy('getThemeById').and.returnValue(of({}))
  }
  const configServiceSpy = {
    getProperty: jasmine.createSpy('getProperty').and.returnValue('123')
  }
  const accSpy = {
    getLocation: jasmine.createSpy('getLocation').and.returnValue({ deploymentPath: '/path' })
  }
  const imageServiceSpy = {
    getImage: jasmine.createSpy('getImage').and.returnValue(of({})),
    deleteImage: jasmine.createSpy('deleteImage').and.returnValue(of({})),
    uploadImage: jasmine.createSpy('uploadImage').and.returnValue(of({})),
    configuration: { basePath: 'basepath' }
  }
  const themeService = jasmine.createSpyObj<ThemeService>('ThemeService', ['apply'])
  const wProductServiceSpy = {
    getProductsByWorkspaceId: jasmine.createSpy('getProductsByWorkspaceId').and.returnValue(of({}))
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspacePropsComponent],
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
        provideRouter([{ path: '', component: WorkspacePropsComponent }]),
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: ConfigurationService, useValue: configServiceSpy },
        { provide: ImagesInternalAPIService, useValue: imageServiceSpy },
        { provide: WorkspaceAPIService, useValue: apiServiceSpy },
        { provide: WorkspaceProductAPIService, useValue: wProductServiceSpy },
        { provide: WorkspaceService, useValue: workspaceServiceMock },
        { provide: Accelerator, useValue: accSpy }
      ],
      teardown: { destroyAfterEach: false }
    }).compileComponents()
    // reset
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.info.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.updateWorkspace.calls.reset()
    apiServiceSpy.getAllThemes.calls.reset()
    themeAPIServiceSpy.getThemes.calls.reset()
    themeAPIServiceSpy.getThemeById.calls.reset()
    wProductServiceSpy.getProductsByWorkspaceId.calls.reset()
    themeService.apply.calls.reset()
    imageServiceSpy.getImage.calls.reset()
    imageServiceSpy.deleteImage.calls.reset()
    imageServiceSpy.uploadImage.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspacePropsComponent)
    accSpy.getLocation()
    component = fixture.componentInstance
    component.workspace = workspace
    fixture.detectChanges()
  })

  it('should create and get themes: no themes', () => {
    expect(component).toBeTruthy()
  })

  it('should create and get themes: themes include ws theme', () => {
    apiServiceSpy.getAllThemes.and.returnValue(of(['theme', 'theme2']))

    expect(component).toBeTruthy()
  })

  it('should create and get themes: themes do not include ws theme', () => {
    apiServiceSpy.getAllThemes.and.returnValue(of(['theme1', 'theme2']))

    expect(component).toBeTruthy()
  })

  describe('loadProductPaths', () => {
    it('should load product urls initially', () => {
      const products = [{ baseUrl: '/productBaseUrl-1' }, { baseUrl: '/productBaseUrl-2' }]
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of(products))

      component.workspace = workspace
      component.onOpenProductPathes([])

      component.productPaths$.subscribe((paths) => {
        expect(paths).toEqual([products[0].baseUrl, products[1].baseUrl])
      })
    })

    it('should prevent loading product urls again', () => {
      const paths = ['/productBaseUrl-1', '/productBaseUrl-2']

      component.workspace = { ...workspace, homePage: undefined }
      component.onOpenProductPathes(paths)
    })
  })

  describe('prepareProductUrl', () => {
    it('should return a joined URL when workspace.baseUrl and val are valid', () => {
      const path = 'test/path'
      const expectedUrl = workspace.baseUrl + '/' + path

      const result = component.prepareProductUrl(path)

      expect(result).toBe(expectedUrl)
    })

    it('should return undefined if val is falsy', () => {
      const val = ''

      const result = component.prepareProductUrl(val)

      expect(result).toBeUndefined()
    })

    it('should return undefined if workspace or workspace.baseUrl is undefined', () => {
      component.workspace = undefined

      const result = component.prepareProductUrl('test/path')

      expect(result).toBeUndefined()
    })
  })

  describe('ngOnChanges', () => {
    it('should disable formGroup in view mode', () => {
      component.editMode = false

      component.ngOnChanges()

      expect(component.formGroup.disabled).toBeTrue()
    })

    it('should enable formGroup in edit mode', () => {
      component.editMode = true

      component.ngOnChanges()

      expect(component.workspace).toEqual(workspace)
      expect(component.formGroup.enabled).toBeTrue()
      expect(component.fetchingLogoUrl).toEqual(workspace.logoUrl)
    })

    it('should reset formGroup when workspace is empty', () => {
      component.editMode = true
      workspace.name = 'ADMIN'

      component.workspace = undefined
      component.ngOnChanges()

      expect(component.formGroup.controls['displayName'].value).toBeNull()
      expect(component.formGroup.controls['theme'].value).toBeNull()
      expect(component.formGroup.controls['baseUrl'].value).toBeNull()
      expect(component.formGroup.disabled).toBeTrue()
    })
  })

  describe('onSave', () => {
    it('should return if no workspace to save', () => {
      component.formGroup = formGroup
      component.workspace = undefined

      component.onSave()
    })

    it('should update workspace onSave', () => {
      component.formGroup = formGroup
      component.workspace = workspace

      component.onSave()
    })

    it('should display error msg if form group invalid', () => {
      component.formGroup = formGroup
      component.workspace = workspace
      component.formGroup.controls['baseUrl'].setValue('url')

      component.onSave()

      expect(msgServiceSpy.error).toHaveBeenCalledWith({
        summaryKey: 'VALIDATION.FORM_INVALID'
      })
    })
  })

  describe('Upload image', () => {
    it('should be informed on image loading error', () => {
      component.onImageLoadingError(true)

      expect(component.fetchingLogoUrl).toBeUndefined()
    })

    it('should be informed on image loading error', () => {
      component.onImageLoadingError(false)

      expect(component.fetchingLogoUrl).toEqual(workspace.logoUrl)
    })
  })

  describe('Upload file', () => {
    it('should not upload a file that is too large', () => {
      const largeBlob = new Blob(['a'.repeat(120000)], { type: 'image/png' })
      const largeFile = new File([largeBlob], 'test.png', { type: 'image/png' })
      const event = {
        target: {
          files: [largeFile]
        }
      }

      component.onFileUpload(event as any)

      expect(component.formGroup.valid).toBeFalse()
    })

    it('should not upload a file that does not end with file ending', () => {
      const largeBlob = new Blob(['a'.repeat(10)], { type: 'image/png' })
      const largeFile = new File([largeBlob], 'test.wrong', { type: 'image/png' })
      const event = {
        target: {
          files: [largeFile]
        }
      }
      component.onFileUpload(event as any)

      expect(component.formGroup.valid).toBeFalse()
    })

    it('should show error if file empty', () => {
      const event = {
        target: {}
      }
      component.onFileUpload(event as any)

      expect(component.formGroup.valid).toBeFalse()
    })

    it('should not upload a file that is too large', () => {
      const largeBlob = new Blob(['a'.repeat(120000)], { type: 'image/png' })
      const largeFile = new File([largeBlob], 'test.png', { type: 'image/png' })
      const event = {
        target: {
          files: [largeFile]
        }
      }
      component.onFileUpload(event as any)

      expect(component.formGroup.valid).toBeFalse()
    })

    it('should upload a file', () => {
      imageServiceSpy.uploadImage.and.returnValue(of({}))
      const blob = new Blob(['a'.repeat(10)], { type: 'image/png' })
      const file = new File([blob], 'test.png', { type: 'image/png' })
      const event = {
        target: {
          files: [file]
        }
      }
      component.formGroup.controls['logoUrl'].setValue('url')

      component.onFileUpload(event as any)

      expect(msgServiceSpy.info).toHaveBeenCalledWith({
        summaryKey: 'IMAGE.UPLOAD_SUCCESS'
      })
    })

    it('should display error if upload fails', () => {
      const errorResponse = { status: 400, statusText: 'Error on getting image' }
      imageServiceSpy.getImage.and.returnValue(throwError(() => errorResponse))
      const blob = new Blob(['a'.repeat(10)], { type: 'image/png' })
      const file = new File([blob], 'test.png', { type: 'image/png' })
      const event = {
        target: {
          files: [file]
        }
      }
      component.formGroup.controls['logoUrl'].setValue('url')

      component.onFileUpload(event as any)

      expect(msgServiceSpy.info).toHaveBeenCalledWith({ summaryKey: 'IMAGE.UPLOAD_SUCCESS' })
    })
  })

  describe('Remove logo', () => {
    it('should remove the log - successful', () => {
      imageServiceSpy.deleteImage.and.returnValue(of({}))

      component.onRemoveLogo()

      expect(component.fetchingLogoUrl).toBeUndefined()
    })

    it('should remove the log - failed', () => {
      const errorResponse = { status: 400, statusText: 'Error on image deletion' }
      imageServiceSpy.deleteImage.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.onRemoveLogo()

      expect(console.error).toHaveBeenCalledWith('deleteImage', errorResponse)
    })
  })

  describe('onInputChange', () => {
    it('should change fetchingLogoUrl on inputChange: valid value', fakeAsync(() => {
      const event = {
        target: { value: 'newLogoValue' }
      } as unknown as Event

      component.onInputChange(event)

      tick(1000)

      expect(component.fetchingLogoUrl).toBe('newLogoValue')
    }))

    it('should change fetchingLogoUrl on inputChange: empty value', fakeAsync(() => {
      const event = {
        target: { value: '' }
      } as unknown as Event

      component.onInputChange(event)

      tick(1000)

      expect(component.fetchingLogoUrl).toBe('basepath/images/ADMIN/logo')
    }))
  })

  describe('getLogoUrl', () => {
    it('call with undefined workspace', () => {
      const testWorkspace: Workspace = undefined!
      expect(component.getLogoUrl(testWorkspace)).toBeUndefined()
    })

    it('call with workspace logo URL', () => {
      const testWorkspace: Workspace = {
        name: 'name',
        theme: 'theme',
        baseUrl: '/some/base/url',
        id: 'id',
        logoUrl: 'testlogoUrl',
        displayName: ''
      }
      expect(component.getLogoUrl(testWorkspace)).toBe(testWorkspace.logoUrl)
    })

    it('call with workspace but no logo URL', () => {
      const testWorkspace: Workspace = {
        name: 'name',
        theme: 'theme',
        baseUrl: '/some/base/url',
        id: 'id',
        displayName: ''
      }
      spyOn(utils, 'bffImageUrl')

      component.getLogoUrl(testWorkspace)

      expect(utils.bffImageUrl).toHaveBeenCalled()
    })
  })

  it('should follow link to current theme', () => {
    spyOn(utils, 'goToEndpoint')

    component.onGoToTheme('themeName')

    expect(utils.goToEndpoint).toHaveBeenCalled()
  })
})
