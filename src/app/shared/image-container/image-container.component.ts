import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core'
import { Observable, map } from 'rxjs'

import { AppStateService } from '@onecx/angular-integration-interface'

import { environment } from 'src/environments/environment'
import { Utils } from 'src/app/shared/utils'

/**
 * This component displays the image with given imageURL.
 * A default image is displayed (stored in assets/images), if
 *   - the image URL was not provided
 *   - the image was not found (http status: 404)
 */
@Component({
  selector: 'app-image-container',
  templateUrl: './image-container.component.html'
})
export class ImageContainerComponent implements OnChanges {
  @Input() public id = 'ws_image_container'
  @Input() public title: string | undefined
  @Input() public small = false
  @Input() public imageUrl: string | undefined
  @Input() public styleClass: string | undefined
  @Input() public defaultLogoType: 'workspace' | 'product' | undefined
  @Output() public imageLoadResult = new EventEmitter<boolean>() // inform caller

  public displayImageUrl: string | undefined
  public defaultImageUrl$: Observable<string>
  public displayDefault = false
  private readonly defaultLogoPaths = {
    workspace: environment.DEFAULT_LOGO_PATH,
    product: environment.DEFAULT_PRODUCT_PATH
  }

  constructor(appState: AppStateService) {
    this.defaultImageUrl$ = appState.currentMfe$.pipe(
      map((mfe) => {
        return Utils.prepareUrlPath(mfe.remoteBaseUrl, this.defaultLogoPaths[this.defaultLogoType ?? 'workspace'])
      })
    )
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('ngOnChanges', this.imageUrl)
    /*
    if (changes['imageUrl'] && this.imageUrl) {
      // check minimum of URL pattern
      if (!/^(http|https):\/\/.{6,245}$/.exec(this.imageUrl)) {
        this.imageUrl = undefined
        this.onImageLoadError()
      }
    }*/
  }

  /**
   * Emit image loading results
   */
  public onImageLoadSuccess(): void {
    if (this.imageUrl !== undefined) this.imageLoadResult.emit(true)
  }

  public onImageLoadError(): void {
    if (this.imageUrl !== undefined) this.imageLoadResult.emit(false)
  }
}
