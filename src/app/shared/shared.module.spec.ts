// import { NO_ERRORS_SCHEMA } from '@angular/core'
// import { TestBed } from '@angular/core/testing'
// import { HttpClient } from '@angular/common/http'
// import { HttpClientTestingModule } from '@angular/common/http/testing'

// import { MfeInfo, TranslateCombinedLoader } from '@onecx/portal-integration-angular'
// import { basePathProvider, HttpLoaderFactory } from './shared.module'

// describe('SharedModule', () => {
//   let httpClient: HttpClient

//   beforeEach(() => {
//     TestBed.configureTestingModule({
//       imports: [HttpClientTestingModule],
//       schemas: [NO_ERRORS_SCHEMA]
//     })

//     httpClient = TestBed.inject(HttpClient)
//   })

//   it('should return the correct basePath with mfeInfo', () => {
//     const mfeInfo: MfeInfo = {
//       mountPath: '',
//       remoteBaseUrl: 'http://localhost:4200/',
//       baseHref: '',
//       shellName: ''
//     }

//     const result = basePathProvider(mfeInfo)

//     expect(result).toEqual('http://localhost:4200/portal-api')
//   })

//   it('should return a translate loader', () => {
//     const mfeInfo: MfeInfo = {
//       mountPath: '',
//       remoteBaseUrl: 'http://localhost:4200/',
//       baseHref: '',
//       shellName: ''
//     }

//     const result = HttpLoaderFactory(httpClient, mfeInfo)

//     expect(result).toBeInstanceOf(TranslateCombinedLoader)
//   })
// })
