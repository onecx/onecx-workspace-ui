import { Component, Input, OnChanges, SimpleChanges } from '@angular/core'
import { map, Observable } from 'rxjs'

import { AppStateService, MfeInfo } from '@onecx/portal-integration-angular'
import { environment } from 'src/environments/environment'
import { prepareUrl, prepareUrlPath } from 'src/app/shared/utils'

@Component({
  selector: 'app-image-container',
  styleUrls: ['./image-container.component.scss'],
  templateUrl: './image-container.component.html'
})
export class ImageContainerComponent implements OnChanges {
  @Input() public id = ''
  @Input() public small = false
  @Input() public imageUrl: string | undefined
  @Input() public styleClass: string | undefined

  public displayPlaceHolder = false
  private apiPrefix = environment.apiPrefix
  public currentMfe$: Observable<Partial<MfeInfo>>

  environment = environment
  prepareUrl = prepareUrl
  prepareUrlPath = prepareUrlPath

  constructor(private appState: AppStateService) {
    this.currentMfe$ = this.appState.currentMfe$.pipe(map((mfe) => mfe))
  }

  public onImageError() {
    this.displayPlaceHolder = true
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['imageUrl']) {
      this.displayPlaceHolder = false
      this.imageUrl = prepareUrl(this.imageUrl)
    }
  }
}
