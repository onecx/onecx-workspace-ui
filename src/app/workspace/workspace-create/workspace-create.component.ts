import { Component, Input, Output, EventEmitter } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { Observable, catchError, map, of } from 'rxjs'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { sortByLocale } from 'src/app/shared/utils'
import { WorkspaceAPIService, ProductAPIService } from 'src/app/shared/generated'

@Component({
  selector: 'app-workspace-create',
  templateUrl: './workspace-create.component.html',
  styleUrls: ['./workspace-create.component.scss']
})
export class WorkspaceCreateComponent {
  @Input() displayDialog = false
  @Output() toggleCreationDialogEvent = new EventEmitter()

  public themes$: Observable<string[]> = of([])
  public productPaths$: Observable<string[]> = of([])
  public formGroup: FormGroup
  public selectedLogoFile: File | undefined
  public minimumImageWidth = 150
  public minimumImageHeight = 150
  public fetchingLogoUrl?: string

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

  public closeDialog(): void {
    this.formGroup.reset()
    this.fetchingLogoUrl = undefined
    this.selectedLogoFile = undefined
    this.toggleCreationDialogEvent.emit()
  }

  public saveWorkspace(): void {
    this.workspaceApi
      .createWorkspace({
        createWorkspaceRequest: { resource: this.formGroup.value }
      })
      .pipe()
      .subscribe({
        next: (fetchedWorkspace) => {
          this.message.success({ summaryKey: 'ACTIONS.CREATE.MESSAGE.CREATE_OK' })
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

  public onOpenThemes(themes: string[]) {
    // if paths already filled then prevent doing twice
    if (themes.length > 0) return
    this.themes$ = this.workspaceApi.getAllThemes().pipe(
      map((data: string[]) => {
        return data ? data.sort(sortByLocale) : []
      }),
      catchError((err) => {
        console.error('searchAvailableProducts', err)
        return of([] as string[])
      })
    )
  }
}
