import { Component, Input, OnChanges, SimpleChanges } from '@angular/core'
import { map } from 'rxjs'

import { AppStateService } from '@onecx/angular-integration-interface'

import { environment } from 'src/environments/environment'
import { prepareUrl, prepareUrlPath } from 'src/app/shared/utils'

@Component({
  selector: 'app-image-container',
  styleUrls: ['./image-container.component.scss'],
  templateUrl: './image-container.component.html'
})
export class ImageContainerComponent implements OnChanges {
  @Input() public id = 'workspace_image_id'
  @Input() public small = false
  @Input() public imageUrl: string | undefined
  @Input() public styleClass: string | undefined

  public displayImageUrl: string | undefined
  public defaultImageUrl = ''
  public displayDefaultLogo = false

  prepareUrl = prepareUrl
  prepareUrlPath = prepareUrlPath

  constructor(private appState: AppStateService) {
    appState.currentMfe$
      .pipe(
        map((mfe) => {
          this.defaultImageUrl = this.prepareUrlPath(mfe.remoteBaseUrl, environment.DEFAULT_LOGO_IMAGE)
        })
      )
      .subscribe()
  }

  public onImageError() {
    this.displayDefaultLogo = true
    this.displayImageUrl = undefined
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('image container ' + this.imageUrl)
    this.displayDefaultLogo = false
    if (changes['imageUrl']) {
      if (this.imageUrl) this.displayImageUrl = prepareUrl(this.imageUrl)
      else this.displayDefaultLogo = true
    }
  }
}
