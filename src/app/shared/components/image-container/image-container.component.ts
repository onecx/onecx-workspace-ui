import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'

import { TooltipModule } from 'primeng/tooltip'

import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
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
  standalone: true,
  imports: [AngularAcceleratorModule, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-container.component.html'
})
export class ImageContainerComponent {
  // signals: HTML properties
  public readonly id = input<string>('ws_image_container')
  public readonly title = input<string | undefined>()
  public readonly styleClass = input<string | undefined>()
  // signals: image data + behavior
  public readonly bffUrl = input<string | undefined>() // uploaded image
  public readonly imageUrl = input<string | undefined>() // external URL
  public readonly cascadeUse = input<boolean>(true) // if false then only the default logo is used if loading failed
  public readonly defaultLogoType = input<'workspace' | 'product' | undefined>()
  // output
  public readonly imageLoadResult = output<boolean>() // inform caller

  private readonly defaultLogoPaths = {
    workspace: environment.DEFAULT_LOGO_PATH,
    product: environment.DEFAULT_PRODUCT_PATH
  }
  private readonly currentMfe = toSignal(inject(AppStateService).currentMfe$)
  private readonly defaultImageUrl = computed(() => {
    const mfe = this.currentMfe()
    return Utils.prepareUrlPath(
      mfe ? mfe.remoteBaseUrl : undefined,
      this.defaultLogoPaths[this.defaultLogoType() ?? 'workspace']
    )
  })
  private readonly _url = signal<string | undefined>(undefined)
  public readonly url = this._url.asReadonly()
  private urlType: 'ext-url' | 'bff-url' | 'def-url' = 'ext-url'

  constructor() {
    effect(() => {
      const imageUrl = this.imageUrl()
      const bffUrl = this.bffUrl()
      const defaultUrl = this.defaultImageUrl()
      if (imageUrl) {
        if (/^(http|https):\/\/.{6,245}$/.exec(imageUrl)) {
          this._url.set(imageUrl)
          this.urlType = 'ext-url'
        } else {
          this._url.set(defaultUrl)
          this.urlType = 'def-url'
        }
      } else if (bffUrl) {
        this._url.set(bffUrl)
        this.urlType = 'bff-url'
      } else {
        this._url.set(defaultUrl)
        this.urlType = 'def-url'
      }
    })
  }

  /**
   * Emit image loading results
   */
  public onImageLoadSuccess(): void {
    if (this.url() !== undefined && this.url() !== this.defaultImageUrl()) {
      this.imageLoadResult.emit(true)
    }
  }

  // on loading error switch URL
  public onImageLoadError(): void {
    if (this.url() !== undefined) this.imageLoadResult.emit(false)

    // using ext-url not possible, use bff URL
    if (this.urlType === 'ext-url' && this.cascadeUse()) {
      if (this.bffUrl()) {
        this._url.set(this.bffUrl())
        this.urlType = 'bff-url'
      } else {
        this._url.set(this.defaultImageUrl())
        this.urlType = 'def-url'
      }
      // using bff-url not possible, use default URL
    } else if (this.defaultImageUrl()) {
      this._url.set(this.defaultImageUrl())
      this.urlType = 'def-url'
    }
  }
}
