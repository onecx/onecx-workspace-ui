import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core'
import { Observable, map } from 'rxjs'

import { AppStateService } from '@onecx/angular-integration-interface'

import { environment } from 'src/environments/environment'
import { prepareUrlPath } from 'src/app/shared/utils'

/**
 * This component displays the image with given imageURL.
 * A default image is displayed (stored in assets/images), if
 *   - the image URL was not provided
 *   - the image was not found (http status: 404)
 */
@Component({
  selector: 'app-image-container',
  styleUrls: ['./image-container.component.scss'],
  templateUrl: './image-container.component.html'
})
export class ImageContainerComponent implements OnChanges {
  @Input() public id = 'image-container'
  @Input() public title: string | undefined
  @Input() public small = false
  @Input() public imageUrl: string | undefined
  @Input() public styleClass: string | undefined
  @Input() public defaultLogoType: 'workspace' | 'product' | undefined
  @Output() public imageLoadError = new EventEmitter<boolean>() // inform caller

  public displayImageUrl: string | undefined
  public defaultImageUrl$: Observable<string>
  public displayDefaultLogo = false
  private readonly defaultLogoPaths = {
    workspace: environment.DEFAULT_LOGO_PATH,
    product: environment.DEFAULT_PRODUCT_PATH
  }

  prepareUrlPath = prepareUrlPath

  constructor(appState: AppStateService) {
    this.defaultImageUrl$ = appState.currentMfe$.pipe(
      map((mfe) => {
        return this.prepareUrlPath(mfe.remoteBaseUrl, this.defaultLogoPaths[this.defaultLogoType ?? 'workspace'])
      })
    )
  }

  public onImageError(): void {
    this.displayDefaultLogo = true
    this.displayImageUrl = undefined
    this.imageLoadError.emit(true)
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['imageUrl']) {
      this.displayDefaultLogo = false
      if (this.imageUrl) {
        this.displayImageUrl = this.imageUrl
        this.imageLoadError.emit(false)
      } else this.displayDefaultLogo = true
    }
  }
}
