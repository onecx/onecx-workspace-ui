import { Component, Output, EventEmitter, OnInit } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { Location } from '@angular/common'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { Observable, Subject, catchError, map, of, takeUntil } from 'rxjs'
import { SelectItem } from 'primeng/api/selectitem'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { sortByLocale } from 'src/app/shared/utils'
import { WorkspaceAPIService, Workspace, ProductAPIService } from 'src/app/shared/generated'

@Component({
  selector: 'app-workspace-create',
  templateUrl: './workspace-create.component.html'
})
export class WorkspaceCreateComponent implements OnInit {
  @Output() toggleCreationDialogEvent = new EventEmitter()

  private readonly destroy$ = new Subject()
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
  public mfeRList: string[] = []

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private workspaceApi: WorkspaceAPIService,
    private message: PortalMessageService,
    private translate: TranslateService,
    private productApi: ProductAPIService
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

  ngOnInit(): void {
    this.loadMfeUrls()
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

  private loadMfeUrls(): void {
    this.productApi
      .searchAvailableProducts({ productStoreSearchCriteria: {} })
      .pipe(
        map((result) => {
          if (result.stream) {
            for (let p of result.stream) {
              if (p.baseUrl) this.mfeRList.push(p.baseUrl)
            }
            this.mfeRList.sort(sortByLocale)
          }
        }),
        catchError((err) => {
          console.error('getProductsByWorkspaceId():', err)
          return of([] as string[])
        })
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe()
  }
}
