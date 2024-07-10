import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { of, throwError } from 'rxjs'

import {
  AUTH_SERVICE,
  ConfigurationService,
  PortalMessageService,
  ThemeService
} from '@onecx/portal-integration-angular'
import { WorkspacePropsComponent } from 'src/app/workspace/workspace-detail/workspace-props/workspace-props.component'
import { WorkspaceAPIService, ImagesInternalAPIService, Workspace } from 'src/app/shared/generated'
import { RouterTestingModule } from '@angular/router/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'

const workspace = {
  name: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url',
  id: 'id'
}

const formGroup = new FormGroup({
  name: new FormControl('name', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
  theme: new FormControl('theme', [Validators.required]),
  baseUrl: new FormControl('/url', [Validators.required, Validators.minLength(1), Validators.pattern('^/.*')])
})

describe('WorkspacePropsComponent', () => {
  let component: WorkspacePropsComponent
  let fixture: ComponentFixture<WorkspacePropsComponent>
  const mockAuthService = jasmine.createSpyObj('IAuthService', ['hasPermission'])

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
  const imageServiceSpy = {
    getImage: jasmine.createSpy('getImage').and.returnValue(of({})),
    updateImage: jasmine.createSpy('updateImage').and.returnValue(of({})),
    uploadImage: jasmine.createSpy('uploadImage').and.returnValue(of({})),
    configuration: {
      basePath: 'basepath'
    }
  }
  const themeService = jasmine.createSpyObj<ThemeService>('ThemeService', ['apply'])

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspacePropsComponent],
      imports: [
        RouterTestingModule,
        HttpClientTestingModule,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: ConfigurationService, useValue: configServiceSpy },
        { provide: ImagesInternalAPIService, useValue: imageServiceSpy },
        { provide: WorkspaceAPIService, useValue: apiServiceSpy },
        { provide: AUTH_SERVICE, useValue: mockAuthService }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.info.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.updateWorkspace.calls.reset()
    apiServiceSpy.getAllThemes.calls.reset()
    themeAPIServiceSpy.getThemes.calls.reset()
    themeAPIServiceSpy.getThemeById.calls.reset()
    themeService.apply.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspacePropsComponent)
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

  describe('ngOnChanges', () => {
    it('should disable formGroup in view mode', () => {
      component.editMode = false

      component.ngOnChanges()

      expect(component.formGroup.disabled).toBeTrue()
    })

    it('should enable formGroup inb edit mode', () => {
      component.editMode = true

      component.ngOnChanges()

      expect(component.formGroup.enabled).toBeTrue()
    })

    it('should disable name form control in admin ws', () => {
      component.editMode = true
      workspace.name = 'ADMIN'

      component.ngOnChanges()

      expect(component.formGroup.controls['name'].disabled).toBeTrue()
    })

    it('should reset formGroup when workspace is empty', () => {
      component.editMode = true
      workspace.name = 'ADMIN'

      component.workspace = undefined
      component.ngOnChanges()

      expect(component.formGroup.controls['name'].value).toBeNull()
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

      expect(component.editMode).toBeFalse()
    })

    it('should update workspace onSave', () => {
      component.formGroup = formGroup
      component.workspace = workspace

      component.onSave()

      expect(component.editMode).toBeFalse()
    })

    it('should display error msg if form group invalid', () => {
      component.formGroup = formGroup
      component.formGroup.controls['baseUrl'].setValue('url')

      component.onSave()

      expect(msgServiceSpy.error).toHaveBeenCalledWith({
        summaryKey: 'VALIDATION.FORM_INVALID'
      })
    })
  })

  describe('onFileUpload', () => {
    it('should not upload a file if name is empty', () => {
      const event = {
        target: {
          files: ['file']
        }
      }
      component.formGroup.controls['name'].setValue('')

      component.onFileUpload(event as any)

      expect(msgServiceSpy.error).toHaveBeenCalledWith({
        summaryKey: 'IMAGE.CONSTRAINT_FAILED',
        detailKey: 'IMAGE.CONSTRAINT_NAME'
      })
    })

    it('should not upload a file if name is null', () => {
      const event = {
        target: {
          files: ['file']
        }
      }
      component.formGroup.controls['name'].setValue(null)

      component.onFileUpload(event as any)

      expect(msgServiceSpy.error).toHaveBeenCalledWith({
        summaryKey: 'IMAGE.CONSTRAINT_FAILED',
        detailKey: 'IMAGE.CONSTRAINT_NAME'
      })
    })

    it('should not upload a file that is too large', () => {
      const largeBlob = new Blob(['a'.repeat(120000)], { type: 'image/png' })
      const largeFile = new File([largeBlob], 'test.png', { type: 'image/png' })
      const event = {
        target: {
          files: [largeFile]
        }
      }
      component.formGroup.controls['name'].setValue('name')

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
      component.formGroup.controls['name'].setValue('name')

      component.onFileUpload(event as any)

      expect(component.formGroup.valid).toBeFalse()
    })

    it('should show error if file empty', () => {
      const event = {
        target: {}
      }
      component.formGroup.controls['name'].setValue('name')

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
      component.formGroup.controls['name'].setValue('name')

      component.onFileUpload(event as any)

      expect(component.formGroup.valid).toBeFalse()
    })

    it('should upload a file', () => {
      imageServiceSpy.updateImage.and.returnValue(of({}))
      const blob = new Blob(['a'.repeat(10)], { type: 'image/png' })
      const file = new File([blob], 'test.png', { type: 'image/png' })
      const event = {
        target: {
          files: [file]
        }
      }

      component.formGroup.controls['name'].setValue('name')
      component.formGroup.controls['logoUrl'].setValue('url')

      component.onFileUpload(event as any)

      expect(msgServiceSpy.info).toHaveBeenCalledWith({
        summaryKey: 'IMAGE.UPLOAD_SUCCESS'
      })
    })

    it('should display error if upload fails', () => {
      imageServiceSpy.getImage.and.returnValue(throwError(() => new Error()))
      const blob = new Blob(['a'.repeat(10)], { type: 'image/png' })
      const file = new File([blob], 'test.png', { type: 'image/png' })
      const event = {
        target: {
          files: [file]
        }
      }
      component.formGroup.controls['name'].setValue('name')
      component.formGroup.controls['logoUrl'].setValue('url')

      component.onFileUpload(event as any)

      expect(msgServiceSpy.info).toHaveBeenCalledWith({
        summaryKey: 'IMAGE.UPLOAD_SUCCESS'
      })
    })
  })

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
    component.formGroup.controls['name'].setValue('name')

    component.onInputChange(event)

    tick(1000)

    expect(component.fetchingLogoUrl).toBe('basepath/images/name/logo')
  }))

  describe('getLogoUrl', () => {
    it('call with undefined workspace', () => {
      let testWorkspace: Workspace = undefined!
      expect(component.getLogoUrl(testWorkspace)).toBeUndefined
    })

    it('call with undefined workspace', () => {
      let testWorkspace: Workspace = {
        name: 'name',
        theme: 'theme',
        baseUrl: '/some/base/url',
        id: 'id',
        logoUrl: 'testlogoUrl'
      }
      expect(component.getLogoUrl(testWorkspace)).toBe(testWorkspace.logoUrl)
    })
  })
})
