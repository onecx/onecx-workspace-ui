import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TranslateTestingModule } from 'ngx-translate-testing'

import { WorkspaceInternComponent } from './workspace-intern.component'

describe('WorkspaceInternComponent', () => {
  let component: WorkspaceInternComponent
  let fixture: ComponentFixture<WorkspaceInternComponent>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceInternComponent],
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [provideHttpClientTesting(), provideHttpClient()],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspaceInternComponent)
    component = fixture.componentInstance

    component.workspace = {
      name: 'name',
      displayName: 'name',
      theme: 'theme',
      baseUrl: '/some/base/url',
      id: 'id'
    }
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnChanges', () => {
    it('should create', () => {
      component.ngOnChanges()
      expect(component.mandatory).toEqual(component.workspace?.mandatory ?? false)
    })
  })
})
