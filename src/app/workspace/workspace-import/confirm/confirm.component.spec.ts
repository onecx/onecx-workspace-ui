import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
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

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ConfirmComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()]
    }).compileComponents()
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
    // WorkspaceAPIService is providedIn: 'any', so the component resolves its own instance
    // that shadows the TestBed root provider. Stub the method on the instance the component
    // actually holds to control the searchWorkspaces result.
    function stubSearchWorkspaces(stream: WorkspaceAbstract[]): void {
      const workspaceApi = (component as unknown as { workspaceApi: WorkspaceAPIService }).workspaceApi
      // the generated method has HttpEvent-typed overloads; cast to satisfy the spy
      spyOn(workspaceApi, 'searchWorkspaces').and.returnValue(
        of({ stream }) as unknown as ReturnType<WorkspaceAPIService['searchWorkspaces']>
      )
    }

    it('should call fetchWorkspace on init when a workspace is imported', () => {
      stubSearchWorkspaces(workspaces)
      component.importWorkspace = { ...impWorkspace }
      spyOn<any>(component, 'fetchWorkspace')

      component.ngOnInit()

      expect(component['fetchWorkspace']).toHaveBeenCalled()
    })

    it('should reflect missing baseUrl on init', () => {
      stubSearchWorkspaces([])
      component.importWorkspace = { ...impWorkspace, baseUrl: undefined }

      component.ngOnInit()

      expect(component.baseUrlIsMissing).toBeTrue()
      expect(component.baseUrlExists).toBeFalse()
    })

    it('should set workspaceNameExists to true in checkWorkspaceUniqueness onInit if no permission', () => {
      stubSearchWorkspaces(workspaces)

      component.importWorkspace = { ...impWorkspace, name: workspaces[0].name }
      component.hasPermission = false

      component.ngOnInit()

      expect(component.workspaceNameExists).toBeTrue()
    })

    it('should set baseUrlExists to true in checkWorkspaceUniqueness onInit', () => {
      stubSearchWorkspaces(workspaces)
      component.importWorkspace = { ...impWorkspace, baseUrl: workspaces[0].baseUrl }

      component.ngOnInit()

      expect(component.baseUrlExists).toBeTrue()
    })
  })
})
