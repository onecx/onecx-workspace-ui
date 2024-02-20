import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
// import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
// import { TranslateLoader, TranslateModule } from '@ngx-translate/core'

// import { HttpLoaderFactory } from 'src/app/shared/shared.module'
import { WorkspaceInternComponent } from './workspace-intern.component'

describe('WorkspaceInternComponent', () => {
  let component: WorkspaceInternComponent
  let fixture: ComponentFixture<WorkspaceInternComponent>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceInternComponent],
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
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspaceInternComponent)
    component = fixture.componentInstance

    component.workspaceDetail = {
      name: 'name',
      theme: 'theme',
      baseUrl: '/some/base/url',
      id: 'id'
    }
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
