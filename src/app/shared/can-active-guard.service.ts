import { Injectable } from '@angular/core'
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { ConfigurationService } from '@onecx/portal-integration-angular'
import { filter, map, Observable, OperatorFunction, tap } from 'rxjs'

const SUPPORTED_LANGUAGES = ['de', 'en']
const DEFAULT_LANG = 'en'

@Injectable()
export class CanActivateGuard implements CanActivate {
  constructor(private txService: TranslateService, private config: ConfigurationService) {}

  /* eslint-disable @typescript-eslint/no-unused-vars */ /* TODO: is route and state needed */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.loadTranslations()
  }

  loadTranslations() {
    console.log(`loadTranslations in portal-mgmt`)
    // this language will be used as a fallback when a translation isn't found in the current language
    this.txService.setDefaultLang(DEFAULT_LANG)

    return this.txService.use(this.getBestMatchLanguage(this.config.lang)).pipe(
      //optional, after we set the language, we can listen for eventual changes to the lang
      tap(() => {
        // console.log(`Translations guard done ${this.config.lang}`)
        this.config.lang$
          //the explict cast is to help linter understand that we will never get undefined
          .pipe(
            filter((x) => x !== undefined) as OperatorFunction<string | undefined, string>,
            map((lang) => lang.toLowerCase())
          )
          .subscribe((newLang) => {
            console.log(`Configuration language: ${newLang}`)
            this.txService.use(this.getBestMatchLanguage(newLang))
          })
      }),
      map(() => true)
    )
  }

  getBestMatchLanguage(lang: string) {
    if (SUPPORTED_LANGUAGES.includes(lang)) {
      return lang
    } else {
      console.warn(
        `⚠ requested language: ${lang} is not among supported languages: ${SUPPORTED_LANGUAGES}, using ${DEFAULT_LANG} as fallback`
      )
      return DEFAULT_LANG
    }
  }
}
