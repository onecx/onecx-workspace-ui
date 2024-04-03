import { Component, Input, OnChanges, SimpleChanges } from '@angular/core'
import { map, Observable } from 'rxjs'

import { MfeInfo } from '@onecx/portal-integration-angular'
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

  public displayPlaceHolder = false
  public currentMfe$: Observable<Partial<MfeInfo>>

  prepareUrl = prepareUrl
  environment = environment
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
