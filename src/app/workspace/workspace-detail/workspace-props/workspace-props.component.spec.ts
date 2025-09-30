import { NO_ERRORS_SCHEMA } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideRouter } from '@angular/router'
import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, throwError } from 'rxjs'

import {
  ConfigurationService,
  PortalMessageService,
  ThemeService,
  WorkspaceService
} from '@onecx/angular-integration-interface'
import * as Accelerator from '@onecx/accelerator'

import {
  Theme,
  WorkspacePropsComponent
} from 'src/app/workspace/workspace-detail/workspace-props/workspace-props.component'
import {
  WorkspaceAPIService,
  ImagesInternalAPIService,
  Workspace,
  WorkspaceProductAPIService,
  RefType,
  MimeType
} from 'src/app/shared/generated'
import { Utils } from 'src/app/shared/utils'

const workspace = {
  id: 'id',
  disabled: false,
  name: 'name',
  displayName: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url',
  homePage: '/welcome',
  logoUrl: 'https://host:port/site/logo.png',
  smallLogoUrl: 'https://host:port/site/logo-small.png'
}
const themesOrg: Theme[] = [
  { name: 'theme1', displayName: 'Theme 1', logoUrl: '/logo', faviconUrl: '/favicon' },
  { name: 'theme2', displayName: 'Theme 2' }
]

const formGroup = new FormGroup({
  displayName: new FormControl('displayName', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
  theme: new FormControl('theme', [Validators.required]),
  baseUrl: new FormControl('/url', [Validators.required, Validators.minLength(1), Validators.pattern('^/.*')])
})

describe('WorkspacePropsComponent', () => {
  let component: WorkspacePropsComponent
  let fixture: ComponentFixture<WorkspacePropsComponent>

  const accSpy = { getLocation: jasmine.createSpy('getLocation').and.returnValue({ deploymentPath: '/path' }) }
  const apiServiceSpy = { updateWorkspace: jasmine.createSpy('updateWorkspace').and.returnValue(of([])) }
  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const configServiceSpy = { getProperty: jasmine.createSpy('getProperty').and.returnValue('123') }
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
  const workspaceServiceMock: jasmine.SpyObj<WorkspaceService> = jasmine.createSpyObj('WorkspaceService', [
    'doesUrlExistFor',
    'getUrl'
  ])

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
        provideHttpClient(),
        provideHttpClientTesting(),
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
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspacePropsComponent)
    accSpy.getLocation()
    component = fixture.componentInstance
    component.workspace = workspace
    fixture.detectChanges()
  })

  afterAll(() => {
    // reset
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.updateWorkspace.calls.reset()
    wProductServiceSpy.getProductsByWorkspaceId.calls.reset()
    themeService.apply.calls.reset()
    imageServiceSpy.getImage.calls.reset()
    imageServiceSpy.deleteImage.calls.reset()
    imageServiceSpy.uploadImage.calls.reset()
  })

  describe('initialize', () => {
    it('should create', () => {
      component.themeLogoLoadingEmitter.emit(true)

      expect(component).toBeTruthy()
    })
  })

  describe('themes', () => {
    it('should get themes form rc emitter', (done) => {
      component.ngOnInit()

      component.themesEmitter.emit(themesOrg)

      component.themes$?.subscribe({
        next: (data) => {
          expect(data).toEqual(themesOrg)
          done()
        },
        error: done.fail
      })
    })

    it('should NOT extend themes if workspace is using a known theme', () => {
      if (component.workspace) {
        component.workspace.theme = 'theme1'

        component.checkAndExtendThemes(themesOrg)

        expect(themesOrg.length).toBe(2)
      }
    })

    it('should extend themes if workspace is using an unknown theme name', () => {
      if (component.workspace) {
        component.workspace.theme = 'unknown'

        component.checkAndExtendThemes(themesOrg)

        expect(themesOrg.length).toBe(3)
      }
    })

    it('should get url if defined - logo', () => {
      if (component.workspace) {
        component.workspace.theme = 'theme1'

        const url = component.getThemeImageUrl(themesOrg, 'theme1', RefType.Logo)

        expect(url).toBe(themesOrg[0].logoUrl)
      }
    })

    it('should get url if defined - favicon', () => {
      if (component.workspace) {
        component.workspace.theme = 'theme1'

        const url = component.getThemeImageUrl(themesOrg, 'theme1', RefType.Favicon)

        expect(url).toBe(themesOrg[0].faviconUrl)
      }
    })
  })

  describe('loadProductPaths', () => {
    it('should load product urls initially', () => {
      const products = [{ baseUrl: '/productBaseUrl-1' }, { baseUrl: '/productBaseUrl-2' }]
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of(products))

      component.workspace = workspace
      component.onOpenProductPaths([])

      component.productPaths$.subscribe((paths) => {
        expect(paths).toEqual([products[0].baseUrl, products[1].baseUrl])
      })
    })

    it('should prevent loading product urls again', () => {
      const paths = ['/productBaseUrl-1', '/productBaseUrl-2']

      component.workspace = { ...workspace, homePage: undefined }
      component.onOpenProductPaths(paths)
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
      expect(component.imageUrl[RefType.Logo]).toEqual(workspace.logoUrl)
      expect(component.imageUrl[RefType.LogoSmall]).toEqual(workspace.smallLogoUrl)
    })

    it('should reset formGroup when workspace is empty', () => {
      component.editMode = true
      component.workspace = undefined

      component.ngOnChanges()

      expect(component.formGroup.controls['displayName'].value).toBeNull()
      expect(component.formGroup.controls['theme'].value).toBeNull()
      expect(component.formGroup.controls['baseUrl'].value).toBeNull()
      expect(component.formGroup.disabled).toBeTrue()
    })
  })

  describe('Saving image', () => {
    it('should return if no workspace to save', () => {
      component.workspace = undefined

      component.onSave()
    })

    it('should update workspace onSave', () => {
      spyOn(component, 'getWorkspaceChangesFromForm')
      component.ngOnChanges() // init form

      component.onSave()

      expect(component.getWorkspaceChangesFromForm).toHaveBeenCalled()
    })

    it('should detect changes on workspaces', () => {
      component.ngOnChanges() // init form
      const url = 'https://abc.de'
      component.formGroup.controls['logoUrl'].setValue(url) // change

      expect(component.formGroup.valid).toBeTrue() // valid form

      const change = component.getWorkspaceChangesFromForm()

      expect(change).toEqual({ logoUrl: url })
    })

    it('should display error msg if form is invalid', () => {
      component.ngOnChanges()
      component.formGroup.controls['logoUrl'].setValue('http://abc') // invalid: too short

      component.onSave()

      expect(component.formGroup.valid).toBeFalse()
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'VALIDATION.FORM_INVALID' })
    })
  })

  describe('Loading image', () => {
    it('should reset image URL on loading error', () => {
      component.onImageLoadingError(true, RefType.Logo)

      expect(component.imageUrl[RefType.Logo]).toBeUndefined()
    })

    it('should use logo URL on image loading success', () => {
      component.onImageLoadingError(false, RefType.Logo)

      expect(component.imageUrl[RefType.Logo]).toEqual(workspace.logoUrl)
    })
  })

  describe('Upload image', () => {
    it('should prevent upload if no file', () => {
      const event = { target: {} }

      component.onFileUpload(event as any, RefType.Logo)

      expect(component.formGroup.valid).toBeFalse()
    })

    it('should not upload a file that is too large', () => {
      const file = new File(['a'.repeat(1200000)], 'test.png', { type: 'image/png' })
      const event = { target: { files: [file] } }

      component.onFileUpload(event as any, RefType.Logo)

      expect(component.formGroup.valid).toBeFalse()
    })

    it('should upload file not possible withh unknown file extension', () => {
      const file = new File(['file content'.repeat(10)], 'test.unknown', { type: 'image/png' })
      const event = { target: { files: [file] } }

      component.onFileUpload(event as any, RefType.Logo)

      expect(component.formGroup.valid).toBeFalse()
    })

    it('should upload file - successful with png', () => {
      imageServiceSpy.uploadImage.and.returnValue(of({}))
      const file = new File(['file content'], 'test.png', { type: 'image/png' })
      const event = { target: { files: [file] } }

      component.onFileUpload(event as any, RefType.Logo)

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'IMAGE.UPLOAD.OK' })

      component.onFileUpload(event as any, RefType.LogoSmall)

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'IMAGE.UPLOAD.OK' })
    })

    it('should upload file - failed with unsupported format', () => {
      imageServiceSpy.uploadImage.and.returnValue(of({}))
      const file = new File(['file content'], 'test.tiff', { type: 'image/tiff' })
      const event = { target: { files: [file] } }

      component.onFileUpload(event as any, RefType.Logo)

      expect(msgServiceSpy.error).toHaveBeenCalledWith({
        summaryKey: 'IMAGE.CONSTRAINT.FAILED',
        detailKey: 'IMAGE.CONSTRAINT.FILE_TYPE'
      })
    })

    it('should upload file - failed with server error', () => {
      const errorResponse = { status: 400, statusText: 'Error on getting image' }
      imageServiceSpy.uploadImage.and.returnValue(throwError(() => errorResponse))
      const file = new File(['file content'], 'test.svg', { type: 'image/svg+xml' })
      const event = { target: { files: [file] } }
      spyOn(console, 'error')

      component.onFileUpload(event as any, RefType.Logo)

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'IMAGE.UPLOAD.NOK' })
      expect(console.error).toHaveBeenCalledWith('uploadImage', errorResponse)
    })

    it('should map mime-types', () => {
      let mt = component['mapMimeType']('image/x-icon')
      expect(mt).toBe(MimeType.XIcon)
      mt = component['mapMimeType']('image/jpg')
      expect(mt).toBe(MimeType.Jpg)
      mt = component['mapMimeType']('image/jpeg')
      expect(mt).toBe(MimeType.Jpeg)
      mt = component['mapMimeType']('image/tiff') // unknown for OneCX
      expect(mt).toBe(MimeType.Png)
    })
  })

  describe('Remove logo', () => {
    it('should remove the real logo URL - successful', () => {
      component.ngOnChanges() // init dialog

      expect(component.imageUrl[RefType.Logo]).toBe(workspace.logoUrl)

      component.editMode = true
      component.onRemoveImage(RefType.Logo)

      expect(component.imageUrl[RefType.Logo]).toBe('basepath/images/name/logo')

      component.onRemoveImage(RefType.LogoSmall)

      expect(component.imageUrl[RefType.LogoSmall]).toBe('basepath/images/name/logo-small')
    })

    it('should remove the used logo URL - successful', () => {
      if (component.workspace) component.workspace.logoUrl = undefined // no real URL
      imageServiceSpy.deleteImage.and.returnValue(of({}))

      component.editMode = false
      component.ngOnChanges() // init dialog

      expect(component.imageUrl[RefType.Logo]).toBe('basepath/images/name/logo')

      component.onRemoveImage(RefType.Logo)

      expect(component.imageUrl[RefType.Logo]).toBeUndefined()
    })

    it('should remove the log - failed', () => {
      const errorResponse = { status: 400, statusText: 'Error on image deletion' }
      imageServiceSpy.deleteImage.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.onRemoveImage(RefType.Logo)

      expect(console.error).toHaveBeenCalledWith('deleteImage', errorResponse)
    })
  })

  describe('onInputChange', () => {
    it('should change logo URL on inputChange: valid value', fakeAsync(() => {
      const event = {
        target: { value: 'newLogoValue' }
      } as unknown as Event

      component.onInputChange(event, RefType.Logo)
      tick(1000)

      expect(component.imageUrl[RefType.Logo]).toBe('newLogoValue')
    }))

    it('should change logo URL on inputChange: empty value', fakeAsync(() => {
      const event = {
        target: { value: '' }
      } as unknown as Event

      component.onInputChange(event, RefType.Logo)
      tick(1000)

      expect(component.imageUrl[RefType.Logo]).toBe('basepath/images/name/logo')
    }))
  })

  describe('getLogoUrl', () => {
    it('call with undefined workspace', () => {
      expect(component.getLogoUrl(undefined, RefType.Logo)).toBeUndefined()
    })
  })

  it('should follow link to current theme', () => {
    spyOn(Utils, 'goToEndpoint')

    component.onGoToTheme('themeName')

    expect(Utils.goToEndpoint).toHaveBeenCalled()
  })
})
