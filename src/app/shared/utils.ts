// import { MicrofrontendDTO } from '@onecx/portal-integration-angular'
import { AbstractControl, FormArray, FormGroup } from '@angular/forms'
import { Location } from '@angular/common'
import { Router } from '@angular/router'
import { catchError, filter, first, mergeMap, Observable, of, tap } from 'rxjs'
import { SelectItem } from 'primeng/api'

import { PortalMessageService, WorkspaceService } from '@onecx/angular-integration-interface'

import { RefType } from 'src/app/shared/generated'

// This object encupsulated function because ...
//  ...Jasmine has problems to spying direct imported functions
const Utils = {
  limitText(text: string | null | undefined, limit: number): string {
    if (text) {
      return text.length < limit ? text : text.substring(0, limit) + '...'
    } else {
      return ''
    }
  },
  copyToClipboard(text?: string): void {
    if (text) navigator.clipboard.writeText(text)
  },

  // Form
  forceFormValidation(form: AbstractControl): void {
    if (form instanceof FormGroup || form instanceof FormArray) {
      for (const inner in form.controls) {
        const control = form.get(inner)
        control && this.forceFormValidation(control)
      }
    } else {
      form.markAsDirty()
      form.markAsTouched()
      form.updateValueAndValidity()
    }
  },

  // Filtering
  filterObject(obj: any, exProps: string[]): any {
    const pickedObj: any = {}
    for (const prop in obj) {
      if (!exProps.includes(prop)) {
        pickedObj[prop] = obj[prop]
      }
    }
    return pickedObj
  },

  filterObjectTree(obj: any, exProps: string[], childProp: string): any {
    const pickedObj: any = {}
    for (const prop in obj) {
      if (!exProps.includes(prop)) {
        pickedObj[prop] = obj[prop]
      }
    }
    // if children exists
    if (childProp in obj && Array.isArray(obj[childProp])) {
      if (obj[childProp].length > 0) {
        pickedObj[childProp] = obj[childProp].map((child: any) => this.filterObjectTree(child, exProps, childProp))
      }
    }
    return pickedObj
  },

  // Sorting
  sortByLocale(a: any, b: any): number {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return 0
    }
    return a.toUpperCase().localeCompare(b.toUpperCase())
  },
  sortByDisplayName(a: any, b: any): number {
    return (a.displayName ? a.displayName.toUpperCase() : '').localeCompare(
      b.displayName ? b.displayName.toUpperCase() : ''
    )
  },
  dropDownSortItemsByLabel(a: SelectItem, b: SelectItem): number {
    return (a.label ? a.label.toUpperCase() : '').localeCompare(b.label ? b.label.toUpperCase() : '')
  },

  // ...
  getCurrentDateTime(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')

    return `${year}-${month}-${day}_${hours}${minutes}${seconds}`
  },

  // paths, bff etc.
  prepareUrlPath(url?: string, path?: string): string {
    if (url && path) return Location.joinWithSlash(url, path)
    else if (url) return url
    else return ''
  },
  bffImageUrl(basePath: string | undefined, name: string | undefined, refType: RefType): string {
    return !name ? '' : basePath + '/images/' + name + '/' + refType
  },
  bffProductImageUrl(basePath: string | undefined, name: string | undefined): string {
    return !name ? '' : basePath + '/images/product/' + name
  },

  // goto
  goToEndpoint(
    workspaceService: WorkspaceService,
    msgService: PortalMessageService,
    router: Router,
    productName: string,
    appId: string,
    endpointName: string,
    params?: Record<string, unknown>
  ): void {
    workspaceService
      .doesUrlExistFor(productName, appId, endpointName)
      .pipe(
        tap((exists) => {
          if (!exists) {
            console.error(
              'Routing not possible for product: ' + productName + '  app: ' + appId + '  endpoint: ' + endpointName
            )
            msgService.error({
              summaryKey: 'EXCEPTIONS.ENDPOINT.NOT_EXIST',
              detailKey: 'EXCEPTIONS.CONTACT_ADMIN'
            })
          }
        }),
        filter((exists) => exists), // stop on not exists
        mergeMap(() => workspaceService.getUrl(productName, appId, endpointName, params))
      )
      .subscribe((url) => {
        router.navigateByUrl(url)
      })
  },

  getEndpointUrl(
    workspaceService: WorkspaceService,
    msgService: PortalMessageService,
    productName: string,
    appId: string,
    endpointName: string,
    params?: Record<string, unknown>
  ): Observable<string> {
    return workspaceService.doesUrlExistFor(productName, appId, endpointName).pipe(
      tap((exists) => {
        if (!exists) {
          console.error(
            'Routing not possible for product: ' + productName + '  app: ' + appId + '  endpoint: ' + endpointName
          )
          msgService.error({ summaryKey: 'EXCEPTIONS.ENDPOINT.NOT_EXIST', detailKey: 'EXCEPTIONS.CONTACT_ADMIN' })
        }
      }),
      filter((exists) => exists), // stop on not exists
      mergeMap(() => workspaceService.getUrl(productName, appId, endpointName, params))
    )
  },

  /**
   * Endpoints
   */
  doesEndpointExist(
    workspaceService: WorkspaceService,
    msgService: PortalMessageService,
    productName: string,
    appId: string,
    endpointName: string
  ): boolean {
    let exist = false
    workspaceService
      .doesUrlExistFor(productName, appId, endpointName)
      .pipe(
        first(),
        tap((exists) => {
          if (!exists) {
            console.error(`Routing not possible to workspace for endpoint: ${productName} ${appId} ${endpointName}`)
            msgService.error({
              summaryKey: 'EXCEPTIONS.ENDPOINT.NOT_EXIST',
              summaryParameters: { product: productName, endpoint: endpointName },
              detailKey: 'EXCEPTIONS.CONTACT_ADMIN'
            })
          }
        }),
        catchError((err) => {
          console.error('doesUrlExistFor', err)
          return of(false)
        })
      )
      .subscribe((ex) => (exist = ex))
    return exist
  }
}

export { Utils }
