// import { MicrofrontendDTO } from '@onecx/portal-integration-angular'
import { AbstractControl, FormArray, FormGroup } from '@angular/forms'
import { SelectItem } from 'primeng/api'

import { Workspace /* , ThemeDTO */ } from 'src/app/shared/generated'

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
export function sortByLocale(a: string, b: string): number {
  return (a as string).toUpperCase().localeCompare((b as string).toUpperCase())
  // return (a ? (a as string).toUpperCase() : '').localeCompare(b ? (b as string).toUpperCase() : '')
}

/**
 *  TREE
 *
 * important: tree need a trigger inside the component like
 *     this.treeNodes = [...this.treeNodes]
 */
/* export function expandAll(treeNodes: TreeNode[]): void {
  treeNodes.forEach((node) => {
    expandRecursive(node, true)
  })
}

export function collapseAll(treeNodes: TreeNode[]): void {
  treeNodes.forEach((node) => {
    expandRecursive(node, false)
  })
}

export function expandRecursive(node: TreeNode, isExpand: boolean): void {
  node.expanded = isExpand
  if (node.children) {
    node.children.forEach((childNode) => {
      expandRecursive(childNode, isExpand)
    })
  }
} */

/*
 * DeepCopy class helps to copy an Original Array or an Object without impacting on original data
 */
/* export function deepCopy(data: any): any {
  let node: any
  if (Array.isArray(data)) {
    node = data.length > 0 ? data.slice(0) : []
    node.forEach((e: any, i: number) => {
      if ((typeof e === 'object' && e) || (Array.isArray(e) && e.length > 0)) {
        node[i] = deepCopy(e)
      }
    })
  } else if (data && typeof data === 'object') {
    node = data instanceof Date ? data : Object.assign({}, data)
    Object.keys(node).forEach((key) => {
      if ((typeof node[key] === 'object' && node[key]) || (Array.isArray(node[key]) && node[key].length > 0)) {
        node[key] = deepCopy(node[key])
      }
    })
  } else {
    node = data
  }
  return node
}

export function deepCopy2(data: any, objMap?: WeakMap<any, any>) {
  if (!objMap) {
    // Map for handle recursive objects
    objMap = new WeakMap()
  }

  // recursion wrapper
  const deeper: any = (value: any) => {
    if (value && typeof value === 'object') {
      return deepCopy2(value, objMap)
    }
    return value
  }

  // Array value
  if (Array.isArray(data)) return data.map(deeper)

  // Object value
  if (data && typeof data === 'object') {
    // Same object seen earlier
    if (objMap.has(data)) return objMap.get(data)
    // Date object
    if (data instanceof Date) {
      const result = new Date(data.valueOf())
      objMap.set(data, result)
      return result
    }
    // Use original prototype
    const node = Object.create(Object.getPrototypeOf(data))
    // Save object to map before recursion
    objMap.set(data, node)
    for (const [key, value] of Object.entries(data)) {
      node[key] = deeper(value)
    }
    return node
  }
  // Scalar value
  return data
} */

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
