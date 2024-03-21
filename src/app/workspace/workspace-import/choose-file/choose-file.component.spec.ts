import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, tick, waitForAsync, fakeAsync } from '@angular/core/testing'
// import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
// import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { of, throwError } from 'rxjs'

import { PortalMessageService } from '@onecx/portal-integration-angular'
// import { HttpLoaderFactory } from 'src/app/shared/shared.module'
import { ChooseFileComponent } from './choose-file.component'
import { WorkspaceAPIService, WorkspaceSnapshot } from 'src/app/shared/generated'

const snapshot: WorkspaceSnapshot = {
  workspaces: {
    workspace: {
      name: 'name'
    }
  }
}

// let keys: string[] = []
// if (snapshot.workspaces) {
//   keys= Object.keys(snapshot.workspaces)
// }

describe('ChooseFileComponent', () => {
  let component: ChooseFileComponent
  let fixture: ComponentFixture<ChooseFileComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const apiServiceSpy = {
    portalImportRequest: jasmine.createSpy('portalImportRequest').and.returnValue(of({}))
  }
  const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['get'])

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ChooseFileComponent],
      imports: [
        HttpClientTestingModule
        // TranslateModule.forRoot({
        //   loader: {
        //     provide: TranslateLoader,
        //     useFactory: HttpLoaderFactory,
        //     deps: [HttpClient]
        //   }
        // })
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceAPIService, useValue: apiServiceSpy }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.portalImportRequest.calls.reset()
    translateServiceSpy.get.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(ChooseFileComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should call toggleImportDialogEvent onClose', () => {
    spyOn(component.importFileSelected, 'emit')
    // const portal = {
    //   portal: {
    //     portalName: 'name',
    //     tenantId: '',
    //     microfrontendRegistrations: new Set([{ version: 1 }])
    //   }
    // }
    component.importWorkspace = snapshot

    component.uploadHandler()

    expect(component.importFileSelected.emit).toHaveBeenCalledOnceWith(component.importWorkspace)
  })

  it('should select a file onSelect, get translations and set importDTO', (done) => {
    translateServiceSpy.get.and.returnValue(of({}))
    const file = new File(['file content'], 'test.txt', { type: 'text/plain' })
    const fileList: FileList = {
      0: file,
      length: 1,
      item: (index: number) => file
    }
    spyOn(file, 'text').and.returnValue(
      Promise.resolve(
        '{"portal": {"portalName": "name", "portalRoles": ["role"], "tenantId": "id",\
        "microfrontendRegistrations": [{"version": "1"}]},\
        "menuItems": [{"name": "menu", "key": "key", "position": 1, "disabled": true, "portalExit": true}]}'
      )
    )
    const event = { files: fileList }
    // const portal = {
    //   portal: {
    //     portalName: 'name',
    //     portalRoles: ['role'],
    //     tenantId: 'id',
    //     microfrontendRegistrations: new Set([{ version: 1 }])
    //   },
    //   menuItems: [{ name: 'menu', key: 'key', position: 1, disabled: true, portalExit: true }]
    // }
    component.importWorkspace = snapshot

    component.onSelect(event)

    setTimeout(() => {
      expect(file.text).toHaveBeenCalled()
      done()
    })
    expect(component.importWorkspace).toEqual(snapshot)
  })

  it('should catch an import error', fakeAsync(() => {
    translateServiceSpy.get.and.returnValue(throwError(() => new Error()))

    const file = new File(['file content'], 'test.txt', { type: 'text/plain' })
    const fileList: FileList = {
      0: file,
      length: 1,
      item: (index: number) => file
    }
    spyOn(file, 'text').and.returnValue(Promise.resolve('{"portal"}'))
    const event = { files: fileList }

    component.onSelect(event)

    tick()

    expect(component.importError).toBeTrue()
  }))

  it('should behave correctly onClear', () => {
    component.onClear()

    expect(component.importWorkspace).toBeNull()
    expect(component.importError).toBeFalse()
    expect(component.validationErrorCause).toEqual('')
  })

  it('should validate a request DTO: missing portal error', () => {
    const obj = {
      menuItems: [{ name: 'menu', key: 'key', position: 1, disabled: true, portalExit: true }]
    }
    const data = { 'WORKSPACE_IMPORT.VALIDATION_WORKSPACE_MISSING': 'missing' }

    ;(component as any).isPortalImportRequestDTO(obj, data)

    expect(component.validationErrorCause).toEqual('undefinedmissing')
  })

  it('should validate a request DTO: missing portal name error', () => {
    const obj = {
      portal: {
        portalRoles: ['role'],
        microfrontendRegistrations: new Set([{ version: 1 }])
      },
      menuItems: [{ name: 'menu', key: 'key', position: 1, disabled: true, portalExit: true }]
    }
    const data = { 'WORKSPACE_IMPORT.VALIDATION_WORKSPACE_NAME_MISSING': 'name missing' }

    ;(component as any).isPortalImportRequestDTO(obj, data)

    expect(component.validationErrorCause).toEqual('undefinedname missing')
  })

  it('should validate a request DTO: missing roles error', () => {
    const obj = {
      portal: {
        portalName: ['name'],
        microfrontendRegistrations: new Set([{ version: 1 }])
      },
      menuItems: [{ name: 'menu', key: 'key', position: 1, disabled: true, portalExit: true }]
    }
    const data = { 'WORKSPACE_IMPORT.VALIDATION_WORKSPACE_ROLES_MISSING': 'roles missing' }

    ;(component as any).isPortalImportRequestDTO(obj, data)

    expect(component.validationErrorCause).toEqual('undefinedroles missing')
  })

  it('should validate a request DTO: missing theme name error', () => {
    const obj = {
      portal: {
        portalName: ['name'],
        portalRoles: ['role'],
        microfrontendRegistrations: new Set([{ version: 1 }])
      },
      menuItems: [{ name: 'menu', key: 'key', position: 1, disabled: true, portalExit: true }],
      themeImportData: { name: '' }
    }
    const data = { 'WORKSPACE_IMPORT.VALIDATION_THEME_NAME_MISSING': 'theme name missing' }

    ;(component as any).isPortalImportRequestDTO(obj, data)

    expect(component.validationErrorCause).toEqual('undefinedtheme name missing')
  })

  it('should validate a request DTO: missing menu item key error', () => {
    const obj = {
      portal: {
        portalName: ['name'],
        portalRoles: ['role'],
        microfrontendRegistrations: new Set([{ version: 1 }])
      },
      menuItems: [{ name: 'menu', position: 1, disabled: true, portalExit: true }]
    }
    const data = { 'WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_KEY_MISSING': 'menu item key missing' }

    ;(component as any).isPortalImportRequestDTO(obj, data)

    expect(component.validationErrorCause).toEqual('undefinedmenu item key missing')
  })

  it('should validate a request DTO: missing menu item name error', () => {
    const obj = {
      portal: {
        portalName: ['name'],
        portalRoles: ['role'],
        microfrontendRegistrations: new Set([{ version: 1 }])
      },
      menuItems: [{ key: 'menu', position: 1, disabled: true, portalExit: true }]
    }
    const data = { 'WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_NAME_MISSING': 'menu item name missing' }

    ;(component as any).isPortalImportRequestDTO(obj, data)

    expect(component.validationErrorCause).toEqual('undefinedmenu item name missing')
  })

  it('should validate a request DTO: wrong position error', () => {
    const obj = {
      portal: {
        portalName: ['name'],
        portalRoles: ['role'],
        microfrontendRegistrations: new Set([{ version: 1 }])
      },
      menuItems: [{ name: 'menu', key: 'key', position: 'one', disabled: true, portalExit: true }]
    }
    const data = { 'WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_WRONG_POSITION': 'wrong position' }

    ;(component as any).isPortalImportRequestDTO(obj, data)

    expect(component.validationErrorCause).toEqual('undefinedwrong position')
  })

  it('should validate a request DTO: wrong disabled error', () => {
    const obj = {
      portal: {
        portalName: ['name'],
        portalRoles: ['role'],
        microfrontendRegistrations: new Set([{ version: 1 }])
      },
      menuItems: [{ name: 'menu', key: 'key', position: 1, disabled: 'true', portalExit: true }]
    }
    const data = { 'WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_WRONG_DISABLED': 'wrong disabled' }

    ;(component as any).isPortalImportRequestDTO(obj, data)

    expect(component.validationErrorCause).toEqual('undefinedwrong disabled')
  })

  it('should validate a request DTO: wrong portal exit error', () => {
    const obj = {
      portal: {
        portalName: ['name'],
        portalRoles: ['role'],
        microfrontendRegistrations: new Set([{ version: 1 }])
      },
      menuItems: [{ name: 'menu', key: 'key', position: 1, disabled: true, portalExit: 'true' }]
    }
    const data = { 'WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_WRONG_WORKSPACEEXIT': 'wrong portal exit' }

    ;(component as any).isPortalImportRequestDTO(obj, data)

    expect(component.validationErrorCause).toEqual('undefinedwrong portal exit')
  })

  it('should validate a request DTO: menu absent error', () => {
    const obj = {
      portal: {
        portalName: ['name'],
        portalRoles: ['role'],
        microfrontendRegistrations: new Set([{ version: 1 }])
      }
    }
    const data = { 'WORKSPACE_IMPORT.VALIDATION_MENU_NOT_EXIST': 'menu absent' }

    ;(component as any).isPortalImportRequestDTO(obj, data)

    expect(component.validationErrorCause).toEqual('undefinedmenu absent')
  })
})
