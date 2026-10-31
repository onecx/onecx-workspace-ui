import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'

import { TooltipModule } from 'primeng/tooltip'

import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import { AppStateService } from '@onecx/angular-integration-interface'

import { environment } from 'src/environments/environment'
import { RefType } from 'src/app/shared/generated'
import { Utils } from 'src/app/shared/utils'

export type image = {
  url?: string
  bffUrl?: string
  name?: string
  imageType: 'workspace' | 'product'
  refType: RefType
  basePath?: string
}
export type UrlType = 'ext-url' | 'bff-url' | 'def-url'

/**
 * This component displays the image with given imageURL.
 * A default image is displayed (stored in assets/images), if
 *   - the image URL was not provided
 *   - the image was not found (http status: 404)
 */
@Component({
  selector: 'app-image',
  standalone: true,
  imports: [AngularAcceleratorModule, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image.component.html'
})
export class ImageComponent {
  // signals: HTML properties
  public readonly id = input<string>('ws_image')
  public readonly title = input<string | undefined>()
  public readonly styleClass = input<string | undefined>()
  // signals: image data + behavior
  public readonly item = input<image | undefined>(undefined) // item with image data
  public readonly cascadeUse = input<boolean>(true) // if false then only the default logo is used if loading failed
  public readonly defaultLogoType = input<'workspace' | 'product' | undefined>()
  public readonly logPrefix = input<string | undefined>(undefined)
  public readonly logEnabled = input<boolean>(false)
  // output
  public readonly imageLoadResult = output<boolean>() // inform caller

  private readonly defaultLogoPaths = {
    workspace: environment.DEFAULT_LOGO_PATH,
    product: environment.DEFAULT_PRODUCT_PATH
  }
  private urlType: UrlType = 'ext-url' // start type
  private readonly currentMfe = toSignal(inject(AppStateService).currentMfe$)

  private readonly defaultImageUrl = computed(() => {
    const mfe = this.currentMfe()
    const item = this.item()
    return Utils.prepareUrlPath(
      mfe ? mfe.remoteBaseUrl : undefined,
      this.defaultLogoPaths[item?.imageType ?? 'workspace']
    )
  })

  private readonly imageBffUrl = computed(() => {
    const item = this.item()
    if (item?.bffUrl) return item.bffUrl
    return Utils.bffImageUrl(item?.basePath, item?.name, item?.refType ?? RefType.Logo)
  })

  // build url on input data
  public readonly url = computed(() => {
    const item = this.item()
    const bffUrl = this.imageBffUrl()
    const defaultUrl = this.defaultImageUrl()
    let _url: string | undefined = undefined
    if (item) {
      this.log('url: URL: ' + item.url + ', BFF URL: ' + bffUrl + ', defaultUrl: ' + defaultUrl)
      if (item.url) {
        if (/^(http|https):\/\/.{6,245}$/.exec(item.url)) {
          this.urlType = 'ext-url'
          _url = item.url
        } else {
          this.urlType = 'def-url'
          _url = defaultUrl
        }
      } else if (bffUrl) {
        this.urlType = 'bff-url'
        _url = bffUrl
      } else {
        this.urlType = 'def-url'
        _url = defaultUrl
      }
    }
    return _url
  })
  // this signal stores the type of URL that failed to load
  readonly failedUrlType = linkedSignal<string | undefined, UrlType | undefined>({
    source: () => this.url(),
    computation: () => undefined as UrlType | undefined // Reset-Wert bei Änderung der Source
  })

  // build url on image load error
  public readonly urlNext = computed(() => {
    const failedUrlType = this.failedUrlType()
    if (!failedUrlType) return undefined

    const bffUrl = this.imageBffUrl()
    const defaultUrl = this.defaultImageUrl()
    let _url: string | undefined = undefined
    this.log('failed URL type: ' + failedUrlType + ', default URL: ' + defaultUrl)
    // using ext-url not possible, use bff URL
    if (failedUrlType === 'ext-url' && this.cascadeUse()) {
      if (bffUrl) {
        _url = bffUrl
        this.urlType = 'bff-url'
      } else {
        _url = defaultUrl
        this.urlType = 'def-url'
      }
      // using bff-url not possible, use default URL
    } else if (defaultUrl) {
      _url = defaultUrl
      this.urlType = 'def-url'
    }
    return _url
  })

  /**
   * Emit image loading results
   */
  public onImageLoadSuccess(): void {
    this.log('load success. URL type: ' + this.urlType + ', URL: ' + this.url())
    if (this.url() !== undefined && this.url() !== this.defaultImageUrl()) {
      this.imageLoadResult.emit(true)
    }
  }

  // on loading error switch URL
  public onImageLoadError(): void {
    this.log('load error occurred. URL type: ' + this.urlType + ', URL: ' + this.url())
    if (this.url() !== undefined) this.imageLoadResult.emit(false)
    this.failedUrlType.set(this.urlType) // triggers the new url calculation in urlNext
  }

  private log(text: string) {
    if (this.logEnabled()) console.info('image: ' + (this.logPrefix() ?? '') + ' => ' + text)
  }
}
