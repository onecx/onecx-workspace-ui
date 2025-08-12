// import { MicrofrontendDTO } from '@onecx/portal-integration-angular'
import { AbstractControl, FormArray, FormGroup } from '@angular/forms'
import { Location } from '@angular/common'
import { Router } from '@angular/router'
import { filter, mergeMap, tap } from 'rxjs'
import { SelectItem } from 'primeng/api'

import { PortalMessageService, WorkspaceService } from '@onecx/angular-integration-interface'

import { environment } from 'src/environments/environment'
import { RefType } from 'src/app/shared/generated'

export function limitText(text: string | null | undefined, limit: number): string {
  if (text) {
    return text.length < limit ? text : text.substring(0, limit) + '...'
  } else {
    return ''
  }
}

export function setFetchUrls(apiPrefix: string, url: string): string {
  if (url && !url.match(/^(http|https)/g)) {
    return apiPrefix + url
  } else {
    return url
  }
}

export function copyToClipboard(text?: string): void {
  if (text) navigator.clipboard.writeText(text)
}

/**
 *  FORM
 */
export function forceFormValidation(form: AbstractControl): void {
  if (form instanceof FormGroup || form instanceof FormArray) {
    for (const inner in form.controls) {
      const control = form.get(inner)
      control && forceFormValidation(control)
    }
  } else {
    form.markAsDirty()
    form.markAsTouched()
    form.updateValueAndValidity()
  }
}

/**
 *  DROPDOWN
 */
export type DropDownChangeEvent = MouseEvent & { value: any }

export function dropDownSortItemsByLabel(a: SelectItem, b: SelectItem): number {
  return (a.label ? a.label.toUpperCase() : '').localeCompare(b.label ? b.label.toUpperCase() : '')
}
export function dropDownGetLabelByValue(ddArray: SelectItem[], val: string): string | undefined {
  const a: any = ddArray.find((item: SelectItem) => {
    return item?.value == val
  })
  return a.label
}

export function sortByLocale(a: any, b: any): number {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return 0
  }
  return a.toUpperCase().localeCompare(b.toUpperCase())
}

export function sortByDisplayName(a: any, b: any): number {
  return (a.displayName ? a.displayName.toUpperCase() : '').localeCompare(
    b.displayName ? b.displayName.toUpperCase() : ''
  )
}

/**
 * Filter objects => exclude given properties
 */
export function filterObject(obj: any, exProps: string[]): any {
  const pickedObj: any = {}
  for (const prop in obj) {
    if (!exProps.includes(prop)) {
      pickedObj[prop] = obj[prop]
    }
  }
  return pickedObj
}

export function filterObjectTree(obj: any, exProps: string[], childProp: string): any {
  const pickedObj: any = {}
  for (const prop in obj) {
    if (!exProps.includes(prop)) {
      pickedObj[prop] = obj[prop]
    }
  }
  // if children exists
  if (childProp in obj && Array.isArray(obj[childProp])) {
    if (obj[childProp].length > 0) {
      pickedObj[childProp] = obj[childProp].map((child: any) => filterObjectTree(child, exProps, childProp))
    }
  }
  return pickedObj
}

/**
 * URLs
 */
export function prepareUrl(url: string | undefined): string | undefined {
  if (url && !url.match(/^(http|https)/g)) {
    return Location.joinWithSlash(environment.apiPrefix, url)
  } else {
    return url
  }
}

export function prepareUrlPath(url?: string, path?: string): string {
  if (url && path) return Location.joinWithSlash(url, path)
  else if (url) return url
  else return ''
}
export function bffImageUrl(basePath: string | undefined, name: string | undefined, refType: RefType): string {
  return !name ? '' : basePath + '/images/' + name + '/' + refType
}
export function bffProductImageUrl(basePath: string | undefined, name: string | undefined): string {
  return !name ? '' : basePath + '/images/product/' + name
}

export function getCurrentDateTime(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day}_${hours}${minutes}${seconds}`
}

export function goToEndpoint(
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
}

const Extras = {
  bffImageUrl(basePath: string | undefined, name: string | undefined, refType: RefType): string {
    return !name ? '' : basePath + '/images/' + name + '/' + refType
  },
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
  }
}

export { Extras }
