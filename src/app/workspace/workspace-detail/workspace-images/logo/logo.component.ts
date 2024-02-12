import { Component, Input, OnChanges, SimpleChanges } from '@angular/core'
import { environment } from '../../../../../environments/environment'

@Component({
  selector: 'app-logo',
  templateUrl: './logo.component.html',
  styleUrls: ['./logo.component.scss']
})
export class LogoComponent implements OnChanges {
  @Input() logoUrl?: string
  public apiPrefix = environment.apiPrefix
  public imageFound = true

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['logoUrl']) {
      this.imageFound = true

      // if logo Url does not start with a http, then it stored in the backend. So we need to put prefix in front
      if (this.logoUrl && !this.logoUrl.match(/^(http|https)/g)) {
        this.logoUrl = this.apiPrefix + this.logoUrl
      }
    }
  }

  showFallbackImage() {
    this.imageFound = false
  }
}
