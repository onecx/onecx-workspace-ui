// /* eslint-disable @typescript-eslint/no-non-null-assertion */
// import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core'
// import { FormControl, Validators } from '@angular/forms'
// import { Table } from 'primeng/table'
// import { TranslateService } from '@ngx-translate/core'

// import {
//   MicrofrontendDTOv1,
//   MicrofrontendV1APIService,
//   MicrofrontendRegistrationDTO,
//   MicrofrontendRegistrationInternalAPIService,
//   PortalDTO
// } from '../../../shared/generated'
// import { DropDownChangeEvent } from '../../../shared/utils'
// import { PortalMessageService } from '@onecx/portal-integration-angular'

// export type MfeRegistered = MicrofrontendRegistrationDTO & {
//   remoteEntry?: string
//   remoteName?: string

//   exposedModule?: string
//   displayName?: string
// }

// @Component({
//   selector: 'app-mfe-registrations',
//   templateUrl: './mfe-registrations.component.html',
//   styleUrls: ['./mfe-registrations.component.scss']
// })
// export class MfeRegistrationsComponent implements OnInit {
//   @Input() portalDetail!: PortalDTO
//   @Input() editMode = false

//   @ViewChild('mfeRTable') mfeRTable: Table | undefined
//   @ViewChild('mfeRTableFilterInput') mfeRTableFilter: ElementRef | undefined

//   public mfeMap: Map<string, MicrofrontendDTOv1> = new Map()
//   public mfeAList: MicrofrontendDTOv1[] = [] // list of all MFEs
//   public mfeRList: MfeRegistered[] = [] // list of registered MFEs
//   public mfeRColumns: object[] = []
//   public mfeRTablePageReport = ''
//   public mfeRTableFilterColumns = ''
//   public mfeLoading = true
//   apiLoading = false
//   displayRegisterDialog = false
//   displayDeregisterDialog = false
//   urlPathPattern = '([^:]*)'
//   mfeIdFC = new FormControl<string | null>(null, [Validators.required])
//   baseUrlFC = new FormControl<string | null>(null, [Validators.pattern(this.urlPathPattern)])
//   selectedMfe: MicrofrontendDTOv1 | undefined

//   constructor(
//     private mfeApi: MicrofrontendV1APIService,
//     private mfeRegApi: MicrofrontendRegistrationInternalAPIService,
//     private translate: TranslateService,
//     private msgService: PortalMessageService
//   ) {
//     mfeApi.getMicrofrontends().subscribe({
//       next: (mfes) => {
//         mfes.reduce((mfeMap, mfe) => mfeMap.set(mfe.id!, mfe), this.mfeMap)
//         this.mfeAList = mfes.sort(this.sortMfesByDisplayName)
//         if (this.mfeAList.length > 0) this.selectedMfe = this.mfeMap.get(this.mfeAList[0].id!)
//         this.loadMfeRegistered()
//       },
//       error: (err) => {
//         this.msgService.error({ summaryKey: 'PORTAL.MFES.MESSAGES.MFE_LOAD_ERROR', detailKey: err.error.message })
//         this.mfeLoading = false
//         console.error(err)
//       }
//     })
//   }

//   ngOnInit() {
//     this.mfeRColumns = [
//       { field: 'baseUrl', header: 'BASE_URL', isSpecial: true },
//       { field: 'remoteBaseUrl', header: 'REMOTE_BASE_URL', isSpecial: true },
//       { field: 'displayName', header: 'DISPLAY_NAME' },
//       { field: 'appId', header: 'APP_ID' },
//       { field: 'actions', header: 'DEREGISTER', isSpecial: true, noSort: true }
//     ]
//     this.translate
//       .get(['PORTAL.MFE.DISPLAY_NAME', 'PORTAL.MFE.REMOTE_BASE_URL', 'PORTAL.MFE.BASE_URL', 'PORTAL.MFE.APP_ID'])
//       .subscribe((data) => {
//         this.mfeRTableFilterColumns = [
//           data['PORTAL.MFE.DISPLAY_NAME'],
//           data['PORTAL.MFE.REMOTE_BASE_URL'],
//           data['PORTAL.MFE.BASE_URL'],
//           data['PORTAL.MFE.APP_ID']
//         ].join(', ')
//       })
//     this.onPaginationMfeRTable()
//   }

//   public loadMfeRegistered(): void {
//     this.mfeRList = Array.from(this.portalDetail.microfrontendRegistrations || []).map((mfeR) => {
//       // a registration without mfe could happen on portal imports => invalid
//       if (this.mfeMap.has(mfeR.mfeId!)) {
//         const mfeA = this.mfeMap.get(mfeR.mfeId!)
//         if (mfeA) {
//           const mfeAInfo = {
//             displayName: mfeA['displayName'],
//             remoteName: mfeA['remoteName'],
//             remoteBaseUrl: mfeA['remoteBaseUrl'],
//             moduleType: mfeA['moduleType']
//           }
//           return { ...mfeR, ...mfeAInfo }
//         }
//       }
//       return mfeR
//     })
//     this.mfeLoading = false
//     this.selectedMfe = undefined
//     this.mfeRList = this.mfeRList.sort(this.sortMfesByBaseUrl)
//   }

//   public onClearFilterMfeRTable(): void {
//     if (this.mfeRTableFilter) {
//       this.mfeRTableFilter.nativeElement.value = ''
//     }
//     this.mfeRTable?.clear()
//     this.loadMfeRegistered()
//   }
//   public onPaginationMfeRTable(): void {
//     if (this.mfeRTable) {
//       this.mfeRTablePageReport = this.preparePageReport(this.mfeRList.length, this.mfeRTable.rows)
//       console.log('REPORT', this.mfeRTablePageReport)
//     }
//   }
//   private preparePageReport(n: number, rows: number): string {
//     if (n === undefined || rows === undefined) return ''
//     let ext = '0'
//     if (n > 0) ext = (n === 1 ? '1' : 'n') + '_' + (n <= rows ? '1' : 'n')
//     return ext
//   }

//   public onSelectMfe(ev: DropDownChangeEvent): void {
//     if (ev && ev.value) {
//       if (this.mfeMap.has(ev.value)) {
//         this.selectedMfe = this.mfeMap.get(ev.value)
//       }
//     }
//   }
//   public onCloseDialog(): void {
//     this.displayRegisterDialog = false
//     this.baseUrlFC.reset()
//     this.mfeIdFC.reset()
//   }

//   public onRegisterMfe(): void {
//     this.apiLoading = true
//     const selectedModule = this.mfeMap.get(this.mfeIdFC.value!) as MicrofrontendDTOv1
//     // sanitize the URL
//     // the overall minimum length is 1, so that the mfe url path could be empty
//     let mfeBaseUrl: string = this.portalDetail.baseUrl ? this.portalDetail.baseUrl : ''
//     if (this.baseUrlFC.value) {
//       if (this.portalDetail.baseUrl && this.portalDetail.baseUrl !== '/') mfeBaseUrl = mfeBaseUrl + '/'
//       mfeBaseUrl = mfeBaseUrl + this.baseUrlFC.value
//       while (mfeBaseUrl.indexOf('//') > -1) mfeBaseUrl = mfeBaseUrl.replace(/\/\//g, '/')
//       if (mfeBaseUrl.substring(mfeBaseUrl.length - 1) === '/')
//         mfeBaseUrl = mfeBaseUrl.substring(0, mfeBaseUrl.length - 1)
//     } else {
//       mfeBaseUrl = mfeBaseUrl + '$'
//     }
//     this.mfeRegApi
//       .registerMicrofrontend({
//         portalId: this.portalDetail.id!,
//         microfrontendRegistrationRequestDTO: {
//           baseUrl: mfeBaseUrl,
//           mfeId: this.mfeIdFC.value!
//         }
//       })
//       .subscribe({
//         next: (data) => {
//           if (!this.portalDetail.microfrontendRegistrations) {
//             this.portalDetail.microfrontendRegistrations = new Set()
//           }
//           this.portalDetail.microfrontendRegistrations.add(data)
//           this.mfeMap.set(selectedModule.id!, selectedModule)
//           this.loadMfeRegistered()
//           this.msgService.success({ summaryKey: 'PORTAL.MFES.MESSAGES.MFE_REGISTRATION_OK' })
//           this.apiLoading = false
//           this.displayRegisterDialog = false
//           this.baseUrlFC.reset()
//           this.mfeIdFC.reset()
//         },
//         error: (err) => {
//           this.msgService.error({
//             summaryKey: 'PORTAL.MFES.MESSAGES.MFE_REGISTRATION_NOK',
//             detailKey:
//               err.error.message.indexOf('already exists') > 0
//                 ? 'PORTAL.MFES.MESSAGES.MFE_ALREADY_EXISTS'
//                 : err.error.message
//           })
//           this.apiLoading = false
//           console.error(err)
//         }
//       })
//   }

//   public onDeregister(mfe: MicrofrontendDTOv1): void {
//     if (!mfe || !mfe?.id) return
//     this.selectedMfe = mfe
//     this.displayDeregisterDialog = true
//   }

//   public deregisterMfe(): void {
//     if (!(this.selectedMfe && this.selectedMfe?.id)) return
//     this.mfeRegApi
//       .deleteMicrofrontendRegistration({
//         mfeRegId: this.selectedMfe.id,
//         portalId: this.portalDetail.id!
//       })
//       .subscribe({
//         next: () => {
//           this.displayDeregisterDialog = false
//           if (!this.portalDetail.microfrontendRegistrations) {
//             this.portalDetail.microfrontendRegistrations = new Set()
//           }
//           if (this.portalDetail.microfrontendRegistrations.size > 0) {
//             this.portalDetail.microfrontendRegistrations.forEach((mfe) => {
//               if (mfe.id === this.selectedMfe?.id) {
//                 this.portalDetail.microfrontendRegistrations?.delete(mfe)
//               }
//             })
//             this.loadMfeRegistered()
//           }
//           this.msgService.success({ summaryKey: 'PORTAL.MFES.MESSAGES.MFE_DEREGISTRATION_OK' })
//         },
//         error: (err) => {
//           this.msgService.error({ summaryKey: 'PORTAL.MFES.MESSAGES.MFE_DEREGISTRATION_NOK' })
//           console.error(err)
//         }
//       })
//   }

//   public sortMfesByDisplayName(a: MicrofrontendDTOv1, b: MicrofrontendDTOv1): number {
//     return (a.displayName ? (a.displayName as string).toUpperCase() : '').localeCompare(
//       b.displayName ? (b.displayName as string).toUpperCase() : ''
//     )
//   }
//   public sortMfesByBaseUrl(a: MicrofrontendRegistrationDTO, b: MicrofrontendRegistrationDTO): number {
//     return (a.baseUrl ? (a.baseUrl as string).toUpperCase() : '').localeCompare(
//       b.baseUrl ? (b.baseUrl as string).toUpperCase() : ''
//     )
//   }
// }
