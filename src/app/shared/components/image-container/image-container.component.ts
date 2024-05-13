import { Component, Input, OnChanges, SimpleChanges } from '@angular/core'
import { map } from 'rxjs'

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
  @Input() public id = ''
  @Input() public title: string | undefined
  @Input() public small = false
  @Input() public imageUrl: string | undefined
  @Input() public styleClass: string | undefined

  public displayImageUrl: string | undefined
  public defaultImageUrl = ''
  public displayDefaultLogo = false

  prepareUrlPath = prepareUrlPath

  constructor(private appState: AppStateService) {
    appState.currentMfe$
      .pipe(
        map((mfe) => {
          this.defaultImageUrl = this.prepareUrlPath(mfe.remoteBaseUrl, environment.DEFAULT_LOGO_PATH)
        })
      )
      .subscribe()
  }

  public onImageError(): void {
    this.displayDefaultLogo = true
    this.displayImageUrl = undefined
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.displayDefaultLogo = false
    if (changes['imageUrl']) {
      if (this.imageUrl) this.displayImageUrl = this.imageUrl
      else this.displayDefaultLogo = true
    }
  }
}
