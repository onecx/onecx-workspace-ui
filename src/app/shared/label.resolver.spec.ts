import { Observable, of } from 'rxjs'
import { LabelResolver } from './label.resolver'

let labelResolver: LabelResolver

describe('LabelResolver', () => {
  const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['get'])

  const activatedRouteSpy = jasmine.createSpyObj('ActivatedRouteSnapshot', [], {
    routeConfig: {
      path: 'path'
    },
    data: {}
  })

  const routerStateSpy = jasmine.createSpyObj('RouterStateSnapshot', [''])

  beforeEach(async () => {
    labelResolver = new LabelResolver(translateServiceSpy)
    translateServiceSpy.get.calls.reset()
    const dataSpy = Object.getOwnPropertyDescriptor(activatedRouteSpy, 'data')?.get as jasmine.Spy<() => {}>
    dataSpy.and.returnValue({})
  })

  it('should translate if breadcrumb is present', (done: DoneFn) => {
    const dataSpy = Object.getOwnPropertyDescriptor(activatedRouteSpy, 'data')?.get as jasmine.Spy<() => {}>
    dataSpy.and.returnValue({
      breadcrumb: 'defined'
    })
    translateServiceSpy.get.and.returnValue(of('translation'))

    const obsResult = labelResolver.resolve(activatedRouteSpy, routerStateSpy) as Observable<string>
    obsResult.subscribe((result) => {
      expect(result).toBe('translation')
      expect(translateServiceSpy.get).toHaveBeenCalledOnceWith('defined')

      done()
    })
  })

  it('should use route path if breadcrumb is not present', () => {
    const result = labelResolver.resolve(activatedRouteSpy, routerStateSpy)

    expect(result).toBe('path')
    expect(translateServiceSpy.get).toHaveBeenCalledTimes(0)
  })

  it('should return an empty string if neither breadcrumb nor route.routeConfig.path are present', () => {
    const routeConfigSpy = Object.getOwnPropertyDescriptor(activatedRouteSpy, 'routeConfig')?.get as jasmine.Spy<
      () => {}
    >
    routeConfigSpy.and.returnValue({})
    const result = labelResolver.resolve(activatedRouteSpy, routerStateSpy)

    expect(result).toBe('')
    expect(translateServiceSpy.get).toHaveBeenCalledTimes(0)
  })
})
