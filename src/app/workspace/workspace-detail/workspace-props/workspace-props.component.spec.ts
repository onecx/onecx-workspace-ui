// import { NO_ERRORS_SCHEMA } from '@angular/core'
// import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
// // import { HttpClient } from '@angular/common/http'
// import { FormControl, FormGroup, Validators } from '@angular/forms'
// import { HttpClientTestingModule } from '@angular/common/http/testing'
// // import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
// import { of, throwError } from 'rxjs'

// import {
//   AUTH_SERVICE,
//   ConfigurationService,
//   PortalMessageService,
//   ThemeService
// } from '@onecx/portal-integration-angular'
// // import { HttpLoaderFactory } from 'src/app/shared/shared.module'
// import { WorkspacePropsComponent } from './workspace-props.component'
// import { WorkspaceAPIService } from '../../../shared/generated'

// const portalDetail = {
//   name: 'name',
//   theme: 'theme',
//   baseUrl: '/some/base/url',
//   id: 'id'
// }

// const formGroup = new FormGroup({
//   portalName: new FormControl('name', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
//   themeName: new FormControl('theme name', [Validators.required]),
//   baseUrl: new FormControl('/url', [Validators.required, Validators.minLength(1), Validators.pattern('^/.*')]),
//   tenantId: new FormControl('')
// })

// describe('WorkspacePropsComponent', () => {
//   let component: WorkspacePropsComponent
//   let fixture: ComponentFixture<WorkspacePropsComponent>
//   const mockAuthService = jasmine.createSpyObj('IAuthService', ['hasPermission'])
//   // eslint-disable-next-line @typescript-eslint/no-unused-vars

//   const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
//   const apiServiceSpy = {
//     updatePortal: jasmine.createSpy('updatePortal').and.returnValue(of([]))
//   }
//   const themeAPIServiceSpy = {
//     getThemes: jasmine.createSpy('getThemes').and.returnValue(of({})),
//     getThemeById: jasmine.createSpy('getThemeById').and.returnValue(of({}))
//   }
//   const configServiceSpy = {
//     getProperty: jasmine.createSpy('getProperty').and.returnValue('123'),
//     getPortal: jasmine.createSpy('getPortal').and.returnValue({
//       themeId: '1234',
//       portalName: 'test',
//       id: 'id',
//       baseUrl: '/',
//       microfrontendRegistrations: []
//     })
//   }
//   const themeService = jasmine.createSpyObj<ThemeService>('ThemeService', ['apply'])

//   beforeEach(waitForAsync(() => {
//     TestBed.configureTestingModule({
//       declarations: [WorkspacePropsComponent],
//       imports: [
//         HttpClientTestingModule
//         // TranslateModule.forRoot({
//         //   loader: {
//         //     provide: TranslateLoader,
//         //     useFactory: HttpLoaderFactory,
//         //     deps: [HttpClient]
//         //   }
//         // })
//       ],
//       schemas: [NO_ERRORS_SCHEMA],
//       providers: [
//         { provide: PortalMessageService, useValue: msgServiceSpy },
//         { provide: ConfigurationService, useValue: configServiceSpy },
//         { provide: WorkspaceAPIService, useValue: apiServiceSpy },
//         // { provide: ThemesAPIService, useValue: themeAPIServiceSpy },
//         { provide: AUTH_SERVICE, useValue: mockAuthService }
//       ]
//     }).compileComponents()
//     msgServiceSpy.success.calls.reset()
//     msgServiceSpy.error.calls.reset()
//     apiServiceSpy.updatePortal.calls.reset()
//     themeAPIServiceSpy.getThemes.calls.reset()
//     themeAPIServiceSpy.getThemeById.calls.reset()
//     themeService.apply.calls.reset()
//   }))

//   beforeEach(() => {
//     fixture = TestBed.createComponent(WorkspacePropsComponent)
//     component = fixture.componentInstance
//     component.portalDetail = portalDetail
//     // component.formGroup = formGroup
//     fixture.detectChanges()
//   })

//   function initializeComponent(): void {
//     fixture = TestBed.createComponent(WorkspacePropsComponent)
//     component = fixture.componentInstance
//     component.portalDetail = portalDetail
//     fixture.detectChanges()
//   }

//   it('should create and get themes', () => {
//     themeAPIServiceSpy.getThemes.and.returnValue(of([]))

//     expect(component).toBeTruthy()
//   })

//   it('should add tenantId to formGroup if permission', () => {
//     mockAuthService.hasPermission.and.callFake((permission: string) => {
//       return permission === 'WORKSPACE_TENANT#VIEW'
//     })

//     initializeComponent()

//     expect(component.formGroup.contains('tenantId')).toBe(true)
//   })

//   it('should setFormData and set editMode onChanges', () => {
//     component.editMode = false

//     component.ngOnChanges()

//     expect(component.formGroup.disabled).toBeTrue()
//   })

//   it('should update portal onSubmit', () => {
//     apiServiceSpy.updatePortal.and.returnValue(of({}))
//     themeAPIServiceSpy.getThemeById.and.returnValue(of({}))
//     themeService.apply
//     component.formGroup = formGroup

//     component.onSubmit()

//     expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.CHANGE_OK' })
//   })

//   it('should set tenantId to null if empty onSubmit', () => {
//     apiServiceSpy.updatePortal.and.returnValue(of({}))
//     themeAPIServiceSpy.getThemeById.and.returnValue(of({}))
//     component.formGroup = formGroup
//     themeService.apply

//     component.onSubmit()

//     expect(component.formGroup.controls['tenantId'].value).toBeNull()
//   })

//   it('should display error msg if update api call fails', () => {
//     apiServiceSpy.updatePortal.and.returnValue(throwError(() => new Error()))
//     component.formGroup = formGroup

//     component.onSubmit()

//     expect(msgServiceSpy.error).toHaveBeenCalledWith({
//       summaryKey: 'ACTIONS.EDIT.MESSAGE.CHANGE_NOK'
//     })
//   })

//   it('should display error msg if update api call fails', () => {
//     component.formGroup = formGroup
//     component.formGroup.controls['baseUrl'].setValue('url')

//     component.onSubmit()

//     expect(msgServiceSpy.error).toHaveBeenCalledWith({
//       summaryKey: 'GENERAL.FORM_VALIDATION'
//     })
//   })

//   it('should open new window onGoToTheme if ctrl key true', () => {
//     const fakeEvent = new MouseEvent('click', { ctrlKey: true })
//     spyOn(window, 'open')
//     const expectedUrl = window.document.location.href + 'theme'

//     component.onGotoTheme(fakeEvent, 'theme')

//     expect(window.open).toHaveBeenCalledWith(expectedUrl, '_blank')
//   })

//   xit('should navigate onGoToTheme if ctrl key false', () => {
//     const fakeEvent = new MouseEvent('click', { ctrlKey: false })
//     spyOn(window, 'open')

//     component.onGotoTheme(fakeEvent, 'theme')

//     expect(window.open).not.toHaveBeenCalled()
//   })
// })
