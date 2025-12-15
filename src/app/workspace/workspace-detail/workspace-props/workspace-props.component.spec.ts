import { NO_ERRORS_SCHEMA, SimpleChanges } from '@angular/core'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideRouter } from '@angular/router'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
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
  ImagesInternalAPIService,
  Workspace,
  WorkspaceAPIService,
  WorkspaceProductAPIService,
  RefType
} from 'src/app/shared/generated'
import { Utils } from 'src/app/shared/utils'

const basePath = '/basepath'
const basePathLogo = basePath + '/images/name/logo'
const basePathLogoSmall = basePath + '/images/name/logo-small'
const workspaceForm = {
  displayName: 'name',
  theme: 'theme1',
  baseUrl: '/some/base/url',
  homePage: '/welcome',
  logoUrl: 'https://host:port/site/logo.png',
  smallLogoUrl: 'https://host:port/site/logo-small.png',
  rssFeedUrl: undefined,
  footerLabel: undefined,
  description: undefined
}
const workspace: Workspace = {
  ...workspaceForm,
  id: 'id',
  disabled: false,
  name: 'name'
}
const changes: SimpleChanges = {
  workspace: {
    currentValue: workspace,
    previousValue: null,
    firstChange: true,
    isFirstChange: () => true
  }
}

const themesOrg: Theme[] = [
  { name: 'theme1', displayName: 'Theme 1', logoUrl: '/logo' },
  { name: 'theme2', displayName: 'Theme 2' }
]

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
    configuration: { basePath: basePath }
  }
  const themeService = jasmine.createSpyObj<ThemeService>('ThemeService', ['apply'])
  const workspaceServiceSpy = jasmine.createSpyObj<WorkspaceService>('WorkspaceService', ['doesUrlExistFor', 'getUrl'])
  const wProductServiceSpy = {
    getProductsByWorkspaceId: jasmine.createSpy('getProductsByWorkspaceId').and.returnValue(of({}))
  }

  function initTestComponent(): void {
    fixture = TestBed.createComponent(WorkspacePropsComponent)
    accSpy.getLocation()
    component = fixture.componentInstance
    component.workspace = workspace
    fixture.detectChanges()
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
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '', component: WorkspacePropsComponent }]),
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: ConfigurationService, useValue: configServiceSpy },
        { provide: ImagesInternalAPIService, useValue: imageServiceSpy },
        { provide: WorkspaceAPIService, useValue: apiServiceSpy },
        { provide: WorkspaceProductAPIService, useValue: wProductServiceSpy },
        { provide: WorkspaceService, useValue: workspaceServiceSpy },
        { provide: Accelerator, useValue: accSpy }
      ],
      teardown: { destroyAfterEach: false }
    }).compileComponents()
  }))

  beforeEach(() => {
    initTestComponent()

    // reset
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.updateWorkspace.calls.reset()
    wProductServiceSpy.getProductsByWorkspaceId.calls.reset()
    themeService.apply.calls.reset()
    imageServiceSpy.getImage.calls.reset()
    imageServiceSpy.deleteImage.calls.reset()
    imageServiceSpy.uploadImage.calls.reset()
    // used in ngOnChanges
    workspaceServiceSpy.doesUrlExistFor.and.returnValue(of(true))
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
    it('should disable propsForm in view mode', () => {
      component.editMode = false

      component.ngOnChanges(changes)

      expect(component.propsForm.disabled).toBeTrue()
    })

    it('should enable propsForm in edit mode - with ext. logo URL', () => {
      component.editMode = true

      component.ngOnChanges(changes)

      expect(component.workspace).toEqual(workspace)
      expect(component.propsForm.enabled).toBeTrue()
      expect(component.propsForm.value).toEqual(workspaceForm)
    })

    it('should enable propsForm in edit mode - without ext. logo URL', () => {
      component.editMode = true
      component.workspace = { ...workspace, logoUrl: undefined }

      component.ngOnChanges(changes)

      expect(component.propsForm.enabled).toBeTrue()
      expect(component.bffUrl[RefType.Logo]).toBe(basePathLogo)
    })

    it('should reset propsForm when workspace is empty', () => {
      component.editMode = true
      component.workspace = undefined

      component.ngOnChanges(changes)

      expect(component.propsForm.controls['displayName'].value).toBeNull()
      expect(component.propsForm.controls['theme'].value).toBeNull()
      expect(component.propsForm.controls['baseUrl'].value).toBeNull()
      expect(component.propsForm.disabled).toBeTrue()
    })
  })

  describe('image', () => {
    beforeEach(() => {
      component.ngOnChanges(changes)
    })

    describe('Saving image', () => {
      it('should return if no workspace to save', () => {
        component.workspace = undefined

        component.onSave()
      })

      it('should update workspace onSave', () => {
        spyOn<any>(component, 'getFormData')

        component.onSave()

        expect(component['getFormData']).toHaveBeenCalled()
      })

      it('should detect changes on workspaces', () => {
        const url = 'https://abc.de'
        component.propsForm.controls['logoUrl'].setValue(url) // change

        expect(component.propsForm.valid).toBeTrue() // valid form

        const change = component['getFormData']()

        expect(change).toEqual({ logoUrl: url })
      })

      it('should display error msg if form is invalid', () => {
        component.propsForm.controls['logoUrl'].setValue('http://abc') // invalid: too short

        component.onSave()

        expect(component.propsForm.valid).toBeFalse()
        expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'VALIDATION.FORM_INVALID' })
      })
    })

    describe('Loading image', () => {
      // initially the used workspace has both external logo URLs
      const bffLogoUrl = Utils.bffImageUrl(basePath, workspace.name, RefType.Logo)

      it('should use bff URL if no external URL was used - on image loading success', () => {
        expect(component.bffUrl[RefType.Logo]).toBe(bffLogoUrl)
        spyOn(component.headerImageUrl, 'emit')

        component.onImageLoadResult(true, RefType.Logo)

        expect(component.headerImageUrl.emit).toHaveBeenCalledWith(bffLogoUrl)
      })

      it('should use bff URL if external URL was used - on image loading success', () => {
        expect(component.bffUrl[RefType.Logo]).toBe(bffLogoUrl)
        spyOn(component.headerImageUrl, 'emit')

        component.onImageLoadResult(true, RefType.Logo, workspace.logoUrl)

        expect(component.headerImageUrl.emit).toHaveBeenCalledWith(workspace.logoUrl)
      })

      it('should not change bff URL if external URL was used - on image loading failed', () => {
        expect(component.bffUrl[RefType.Logo]).toBe(bffLogoUrl)
        spyOn(component.headerImageUrl, 'emit')

        component.onImageLoadResult(false, RefType.Logo, workspace.logoUrl)

        expect(component.headerImageUrl.emit).toHaveBeenCalledWith(undefined)
        expect(component.bffUrl[RefType.Logo]).toBe(bffLogoUrl)
      })

      it('should reset bff URL if external URL was not used - on image loading failed', () => {
        expect(component.bffUrl[RefType.Logo]).toBe(bffLogoUrl)
        spyOn(component.headerImageUrl, 'emit')

        component.onImageLoadResult(false, RefType.Logo)

        expect(component.headerImageUrl.emit).toHaveBeenCalledWith(undefined)
        expect(component.bffUrl[RefType.Logo]).toBeUndefined()
      })
    })

    describe('Upload image', () => {
      it('should prevent upload if there is no file', () => {
        const event = { target: {} }

        component.onFileUpload(event as any, RefType.Logo)

        expect(msgServiceSpy.error).toHaveBeenCalledWith({
          summaryKey: 'IMAGE.CONSTRAINT.FAILED',
          detailKey: 'IMAGE.CONSTRAINT.FILE_MISSING'
        })
      })

      it('should not upload a file that is too large', () => {
        const file = new File(['a'.repeat(1200000)], 'test.png', { type: 'image/png' })
        const event = { target: { files: [file] } }

        component.onFileUpload(event as any, RefType.Logo)

        expect(msgServiceSpy.error).toHaveBeenCalledWith({
          summaryKey: 'IMAGE.CONSTRAINT.FAILED',
          detailKey: 'IMAGE.CONSTRAINT.SIZE'
        })
      })

      it('should upload file not possible withh unknown file extension', () => {
        const file = new File(['file content'.repeat(10)], 'test.unknown', { type: 'image/png' })
        const event = { target: { files: [file] } }

        component.onFileUpload(event as any, RefType.Logo)

        expect(msgServiceSpy.error).toHaveBeenCalledWith({
          summaryKey: 'IMAGE.CONSTRAINT.FAILED',
          detailKey: 'IMAGE.CONSTRAINT.FILE_TYPE'
        })
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

      it('should upload file - successful with other formats', () => {
        imageServiceSpy.uploadImage.and.returnValue(of({}))

        let file = new File(['file content'], 'test.jpg', { type: 'image/jpg' })
        let event = { target: { files: [file] } }
        component.onFileUpload(event as any, RefType.Logo)

        expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'IMAGE.UPLOAD.OK' })

        file = new File(['file content'], 'test.jpeg', { type: 'image/jpeg' })
        event = { target: { files: [file] } }
        component.onFileUpload(event as any, RefType.Logo)

        expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'IMAGE.UPLOAD.OK' })

        file = new File(['file content'], 'test.png', { type: 'image/tiff' })
        event = { target: { files: [file] } }
        component.onFileUpload(event as any, RefType.Logo)

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
    })

    describe('Remove image or URL', () => {
      it('should remove the real logo URL - successful', () => {
        component.editMode = true
        component.onRemoveImageUrl(RefType.Logo)

        expect(component.bffUrl[RefType.Logo]).toBe(basePathLogo)

        component.onRemoveImageUrl(RefType.LogoSmall)

        expect(component.bffUrl[RefType.LogoSmall]).toBe(basePathLogoSmall)
      })

      it('should remove the used logo URL - successful', () => {
        //if (component.workspace) component.workspace.logoUrl = undefined // no real URL
        imageServiceSpy.deleteImage.and.returnValue(of({}))
        component.editMode = false
        component.bffUrl[RefType.Logo] = basePathLogo

        component.onRemoveImage(RefType.Logo)

        expect(component.bffUrl[RefType.Logo]).toBeUndefined()
      })

      it('should remove the log - failed', () => {
        const errorResponse = { status: 400, statusText: 'Error on image deletion' }
        imageServiceSpy.deleteImage.and.returnValue(throwError(() => errorResponse))
        component.editMode = false
        component.bffUrl[RefType.Logo] = basePathLogo
        spyOn(console, 'error')

        component.onRemoveImage(RefType.Logo)

        expect(console.error).toHaveBeenCalledWith('deleteImage', errorResponse)
      })
    })
  })

  describe('setImageUrl', () => {
    it('call with undefined workspace', () => {
      expect(component.setBffImageUrl(undefined, RefType.Logo)).toBeUndefined()
    })
  })

  describe('getThemeEndpointUrl', () => {
    beforeEach(() => {
      component.workspace = workspace
    })

    it('should themeEndpointExist - exist', (done) => {
      component.themeEndpointExist = true
      workspaceServiceSpy.getUrl.and.returnValue(of('/url'))

      const eu$ = component.getThemeEndpointUrl$('name')

      eu$.subscribe({
        next: (data) => {
          if (data) {
            expect(data).toBe('/url')
          }
          done()
        },
        error: done.fail
      })
    })

    it('should themeEndpointExist - not exist', (done) => {
      component.themeEndpointExist = false
      const errorResponse = { status: 400, statusText: 'Error on check endpoint' }
      workspaceServiceSpy.getUrl.and.returnValue(throwError(() => errorResponse))

      const eu$ = component.getThemeEndpointUrl$('name')

      eu$.subscribe({
        next: (data) => {
          if (data) {
            expect(data).toBeFalse()
          }
          done()
        },
        error: done.fail
      })
    })
  })
})
