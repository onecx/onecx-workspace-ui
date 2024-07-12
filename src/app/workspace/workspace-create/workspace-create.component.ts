import { Component, Output, EventEmitter } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { Observable, map } from 'rxjs'
import { SelectItem } from 'primeng/api/selectitem'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { sortByLocale } from 'src/app/shared/utils'
import { WorkspaceAPIService, Workspace } from 'src/app/shared/generated'

@Component({
  selector: 'app-workspace-create',
  templateUrl: './workspace-create.component.html'
})
export class WorkspaceCreateComponent {
  @Output() toggleCreationDialogEvent = new EventEmitter()

  public themes$: Observable<SelectItem<string>[]>
  public formGroup: FormGroup
  private workspace!: Workspace
  public hasPermission = false
  public selectedLogoFile: File | undefined
  public preview = false
  public previewSrc: string | undefined
  public minimumImageWidth = 150
  public minimumImageHeight = 150
  public workspaceCreationValidationMsg = false
  public fetchingLogoUrl?: string
  public urlPattern = '/base-path-to-workspace'

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private workspaceApi: WorkspaceAPIService,
    private message: PortalMessageService,
    private translate: TranslateService
  ) {
    this.formGroup = new FormGroup({
      name: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
      displayName: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
      theme: new FormControl(null),
      homePage: new FormControl(null, [Validators.maxLength(255)]),
      logoUrl: new FormControl('', [Validators.maxLength(255)]),
      baseUrl: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.pattern('^/.*')]),
      footerLabel: new FormControl(null, [Validators.maxLength(255)]),
      description: new FormControl(null, [Validators.maxLength(255)])
    })
    this.themes$ = this.workspaceApi.getAllThemes().pipe(
      map((val: any[]) => {
        val.sort(sortByLocale)
        return val
      })
    )
  }

  closeDialog() {
    this.formGroup.reset()
    this.fetchingLogoUrl = undefined
    this.selectedLogoFile = undefined
    this.toggleCreationDialogEvent.emit()
  }

  saveWorkspace() {
    this.workspace = { ...this.formGroup.value }
    this.workspaceApi
      .createWorkspace({
        createWorkspaceRequest: { resource: this.formGroup.value }
      })
      .pipe()
      .subscribe({
        next: (fetchedWorkspace) => {
          this.message.success({ summaryKey: 'ACTIONS.CREATE.MESSAGE.CREATE_OK' })
          this.workspaceCreationValidationMsg = false
          this.closeDialog()
          this.router.navigate(['./' + fetchedWorkspace.resource?.name], { relativeTo: this.route })
        },
        error: (err: { error: { message: any } }) => {
          this.message.error({ summaryKey: 'ACTIONS.CREATE.MESSAGE.CREATE_NOK' })
        }
      })
  }

  inputChange(event: Event) {
    this.fetchingLogoUrl = (event.target as HTMLInputElement).value
  }
}
