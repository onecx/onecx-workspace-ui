import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { Location } from '@angular/common'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { Observable, Subject, catchError, map, of } from 'rxjs'
import { SelectItem } from 'primeng/api/selectitem'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { sortByLocale } from 'src/app/shared/utils'
import { WorkspaceAPIService, ProductAPIService } from 'src/app/shared/generated'

@Component({
  selector: 'app-workspace-create',
  templateUrl: './workspace-create.component.html',
  styleUrls: ['./workspace-create.component.scss']
})
export class WorkspaceCreateComponent implements OnInit {
  @Input() displayDialog = false
  @Output() toggleCreationDialogEvent = new EventEmitter()

  private readonly destroy$ = new Subject()
  public themes$!: Observable<SelectItem<string>[]>
  public productPaths$: Observable<string[]> = of([])
  public formGroup: FormGroup
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
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly workspaceApi: WorkspaceAPIService,
    private readonly message: PortalMessageService,
    private readonly translate: TranslateService,
    private readonly productApi: ProductAPIService
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
  }

  ngOnInit(): void {
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
    if (this.formGroup.controls['homePage'].value) {
      this.formGroup.controls['homePage'].setValue(
        Location.joinWithSlash(this.formGroup.controls['baseUrl'].value, this.formGroup.controls['homePage'].value)
      )
    }
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
        error: (err) => {
          this.message.error({ summaryKey: 'ACTIONS.CREATE.MESSAGE.CREATE_NOK' })
          console.error('createWorkspace', err)
        }
      })
  }

  inputChange(event: Event) {
    this.fetchingLogoUrl = (event.target as HTMLInputElement).value
  }

  public onOpenProductPathes(paths: string[]) {
    // if paths already filled then prevent doing twice
    if (paths.length > 0) return
    this.productPaths$ = this.productApi.searchAvailableProducts({ productStoreSearchCriteria: {} }).pipe(
      map((result) => {
        const paths: string[] = []
        if (result.stream) {
          for (const p of result.stream) {
            if (p.baseUrl) paths.push(p.baseUrl)
          }
          paths.sort(sortByLocale)
        }
        return paths
      }),
      catchError((err) => {
        console.error('searchAvailableProducts', err)
        return of([] as string[])
      })
    )
  }
}
