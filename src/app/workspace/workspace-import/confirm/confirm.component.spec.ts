import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of } from 'rxjs'

import { WorkspaceAPIService, WorkspaceAbstract } from 'src/app/shared/generated'
import { ConfirmComponent } from './confirm.component'
import { ImportWorkspace } from '../workspace-import.component'

const impWorkspace: ImportWorkspace = {
  name: 'impname',
  displayName: 'Import Display Name',
  theme: 'theme',
  baseUrl: 'url'
}
const workspaces: WorkspaceAbstract[] = [
  {
    name: 'name',
    displayName: 'Display Name',
    description: 'descr',
    theme: 'theme',
    baseUrl: 'url'
  }
]

describe('ConfirmComponent', () => {
  let component: ConfirmComponent
  let fixture: ComponentFixture<ConfirmComponent>

  const apiServiceSpy = {
    searchWorkspaces: jasmine.createSpy('searchWorkspaces').and.returnValue(of({}))
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ConfirmComponent],
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
        { provide: WorkspaceAPIService, useValue: apiServiceSpy }
      ]
    }).compileComponents()

    apiServiceSpy.searchWorkspaces.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfirmComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  describe('initialize', () => {
    it('should create', () => {
      expect(component).toBeTruthy()
    })
  })

  describe('on init', () => {
    it('should set baseUrlExists to true in checkWorkspaceUniqueness onInit', () => {
      apiServiceSpy.searchWorkspaces.and.returnValue(of({ stream: workspaces }))
      component.importWorkspace = { ...impWorkspace }

      component.ngOnInit()
    })

    it('should reflect missing baseUrl and fetch portals OnInit', () => {
      apiServiceSpy.searchWorkspaces.and.returnValue(of([]))
      component.importWorkspace = { ...impWorkspace, baseUrl: undefined }
      spyOn(component, 'checkWorkspaceUniqueness')

      component.ngOnInit()

      expect(component.checkWorkspaceUniqueness).toHaveBeenCalled()
      expect(component.baseUrlIsMissing).toBeTrue()
    })

    it('should set workspaceNameExists to true in checkWorkspaceUniqueness onInit if no permission', () => {
      apiServiceSpy.searchWorkspaces.and.returnValue(of({ stream: workspaces }))

      component.importWorkspace = { ...impWorkspace, name: workspaces[0].name }
      component.hasPermission = false

      component.ngOnInit()

      expect(component.workspaceNameExists).toBeTrue()
    })

    it('should set baseUrlExists to true in checkWorkspaceUniqueness onInit', () => {
      apiServiceSpy.searchWorkspaces.and.returnValue(of({ stream: workspaces }))
      component.importWorkspace = { ...impWorkspace, baseUrl: workspaces[0].baseUrl }

      component.ngOnInit()

      expect(component.baseUrlExists).toBeTrue()
    })
  })
})
