export type SlimMenuItems = SlimMenuItem[]

export interface SlimMenuItem {
  active: boolean
  type?: ItemType
  label?: string
  icon?: string
  command?: (event: any) => void
  routerLink?: any
  url?: string
  tooltip?: string
}

export enum ItemType {
  URL = 'url',
  ROUTER_LINK = 'routerlink',
  ACTION = 'action'
}
