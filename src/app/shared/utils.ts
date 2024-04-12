// import { MicrofrontendDTO } from '@onecx/portal-integration-angular'
import { AbstractControl, FormArray, FormGroup } from '@angular/forms'
import { SelectItem } from 'primeng/api'
import { Location } from '@angular/common'
import { environment } from 'src/environments/environment'

import { Workspace } from 'src/app/shared/generated'

export function limitText(text: string, limit: number): string {
  if (text) {
    return text.length < limit ? text : text.substring(0, limit) + '...'
  } else {
    return ''
  }
}

/**
 * Clones a given workspace and converts its microfrontends Set to an array.
 *
 * Used to avoid serialization issues caused by Sets when sending a workspace to the backend.
 * @param workspace Workspace that should be cloned
 * @returns Clone of the workspace which contains the workspace microfrontends as an array.
 */
export function cloneWorkspaceWithMicrofrontendsArray(workspace: Workspace): Workspace {
  const updatedPortal: Workspace = { ...workspace }
  // updatedPortal.microfrontendRegistrations = Array.from(
  //   workspace.microfrontendRegistrations ?? []
  // ) as unknown as Set<MicrofrontendDTO>
  return updatedPortal
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
  return (a.label ? (a.label as string).toUpperCase() : '').localeCompare(
    b.label ? (b.label as string).toUpperCase() : ''
  )
}
export function dropDownGetLabelByValue(ddArray: SelectItem[], val: string): string | undefined {
  const a: any = ddArray.find((item: SelectItem) => {
    return item?.value == val
  })
  return a.label
}

export function sortByLocale(a: any, b: any): number {
  return a.toUpperCase().localeCompare(b.toUpperCase())
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
