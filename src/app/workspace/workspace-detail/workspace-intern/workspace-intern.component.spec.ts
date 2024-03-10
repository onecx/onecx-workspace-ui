import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'

import { AppStateService, createTranslateLoader } from '@onecx/portal-integration-angular'
import { WorkspaceInternComponent } from 'src/app/workspace/workspace-detail/workspace-intern/workspace-intern.component'

describe('WorkspaceInternComponent', () => {
  let component: WorkspaceInternComponent
  let fixture: ComponentFixture<WorkspaceInternComponent>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceInternComponent],
      imports: [
        HttpClientTestingModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: createTranslateLoader,
            deps: [HttpClient, AppStateService]
          }
        })
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspaceInternComponent)
    component = fixture.componentInstance

    component.workspace = {
      name: 'name',
      theme: 'theme',
      baseUrl: '/some/base/url',
      id: 'id'
    }
    fixture.detectChanges()
  })

  fit('should create', () => {
    expect(component).toBeTruthy()
  })
})
