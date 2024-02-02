import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { Observable } from 'rxjs'

//dont use `providedIn root` - wont work when we are in shell
@Injectable()
export class LabelResolver implements Resolve<string> {
  constructor(private translate: TranslateService) {}
  /* eslint-disable @typescript-eslint/no-unused-vars */ /* TODO: is state needed */
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): string | Observable<string> | Promise<string> {
    return route.data['breadcrumb'] ? this.translate.instant(route.data['breadcrumb']) : route.routeConfig?.path
  }
}
