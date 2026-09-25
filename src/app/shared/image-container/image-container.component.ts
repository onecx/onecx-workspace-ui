import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { TranslateModule } from '@ngx-translate/core'
import { map } from 'rxjs'

import { TooltipModule } from 'primeng/tooltip'

import { AppStateService } from '@onecx/angular-integration-interface'
import { AngularAcceleratorModule } from '@onecx/angular-accelerator'

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
  standalone: true,
  imports: [AngularAcceleratorModule, TooltipModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-container.component.html'
})
export class ImageContainerComponent {
  // signals: HTML properties
  public readonly id = input<string>('th_image_container')
  public readonly title = input<string | undefined>()
  public readonly styleClass = input<string | undefined>('')
  // signals: image data + behavior
  public readonly bffUrl = input<string | undefined>() // uploaded image
  public readonly imageUrl = input<string | undefined>() // external URL
  public readonly cascadeUse = input<boolean>(true) // if false then only the default logo is used if loading failed

  public readonly imageLoadResult = output<boolean>() // inform caller

  private readonly defaultImageUrl = toSignal(
    inject(AppStateService).currentMfe$.pipe(
      map((mfe) => Utils.prepareUrlPath(mfe.remoteBaseUrl, environment.DEFAULT_LOGO_PATH))
    )
  )
  private readonly _url = signal<string | undefined>(undefined)
  public readonly url = this._url.asReadonly()
  private urlType: 'ext-url' | 'bff-url' | 'def-url' = 'ext-url'

  constructor() {
    effect(() => {
      const imageUrl = this.imageUrl()
      const bffUrl = this.bffUrl()
      const defaultUrl = this.defaultImageUrl()
      if (imageUrl && /^(http|https):\/\/.{6,245}$/.exec(imageUrl)) {
        this._url.set(imageUrl)
        this.urlType = 'ext-url'
      } else if (bffUrl) {
        this._url.set(bffUrl)
        this.urlType = 'bff-url'
      } else {
        this._url.set(defaultUrl)
        this.urlType = 'def-url'
      }
    })
  }

  public onImageLoadSuccess(): void {
    if (this.url() !== undefined && this.url() !== this.defaultImageUrl()) {
      this.imageLoadResult.emit(true)
    }
  }

  public onImageLoadError(): void {
    if (this.url() !== undefined) this.imageLoadResult.emit(false)

    if (this.urlType === 'ext-url' && this.cascadeUse()) {
      if (this.bffUrl()) {
        this._url.set(this.bffUrl())
        this.urlType = 'bff-url'
      } else {
        this._url.set(this.defaultImageUrl())
        this.urlType = 'def-url'
      }
    } else if (this.defaultImageUrl()) {
      this._url.set(this.defaultImageUrl())
      this.urlType = 'def-url'
    }
  }
}
