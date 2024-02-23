import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { WorkspaceCreateComponent } from './workspace-create.component'
import { TranslateModule, TranslateLoader } from '@ngx-translate/core'
import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { ReactiveFormsModule } from '@angular/forms'
import { RouterTestingModule } from '@angular/router/testing'
import { NO_ERRORS_SCHEMA } from '@angular/core'
// import { By } from '@angular/platform-browser'
import { ConfirmationService, MessageService } from 'primeng/api'
import { DropdownModule } from 'primeng/dropdown'

import { environment } from 'src/environments/environment'
import { APP_CONFIG, AppStateService, createTranslateLoader } from '@onecx/portal-integration-angular'
// import { PortalInternalAPIService } from 'src/app/generated'

describe('WorkspaceCreateComponent', () => {
  let component: WorkspaceCreateComponent
  let fixture: ComponentFixture<WorkspaceCreateComponent>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceCreateComponent],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        ReactiveFormsModule,
        DropdownModule,
        TranslateModule.forRoot({
          isolate: true,
          loader: {
            provide: TranslateLoader,
            useFactory: createTranslateLoader,
            deps: [HttpClient, AppStateService]
          }
        })
      ],
      providers: [
        { provide: APP_CONFIG, useValue: environment },
        // PortalInternalAPIService,
        MessageService,
        ConfirmationService
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspaceCreateComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  // it('should start with values', () => {
  //   expect(component.isIdEmpty).toBe(false, 'off at first')
  //   expect(component.isLoading).toBe(true, 'on at first')
  // })

  // it('should display portal page', () => {
  //   const item = fixture.debugElement.query(By.directive(PortalPageComponent))
  //   expect(item).toBeDefined()
  // })

  // it('should display portal mgmt form', () => {
  //   const items = fixture.debugElement.queryAll(By.directive(PortalFormComponent))
  //   expect(items[0]).toBeDefined()
  // })
})
