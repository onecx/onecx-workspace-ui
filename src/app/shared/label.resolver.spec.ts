import { LabelResolver } from './label.resolver'

let labelResolver: LabelResolver

describe('LabelResolver', () => {
  const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant'])

  const activatedRouteSpy = jasmine.createSpyObj('ActivatedRouteSnapshot', [], {
    routeConfig: {
      path: 'path'
    },
    data: {}
  })

  const routerStateSpy = jasmine.createSpyObj('RouterStateSnapshot', [''])

  beforeEach(async () => {
    labelResolver = new LabelResolver(translateServiceSpy)
    translateServiceSpy.instant.calls.reset()
    const dataSpy = Object.getOwnPropertyDescriptor(activatedRouteSpy, 'data')?.get as jasmine.Spy<() => {}>
    dataSpy.and.returnValue({})
  })

  it('should translate if breadcrumb is present', () => {
    const dataSpy = Object.getOwnPropertyDescriptor(activatedRouteSpy, 'data')?.get as jasmine.Spy<() => {}>
    dataSpy.and.returnValue({
      breadcrumb: 'defined'
    })
    translateServiceSpy.instant.and.returnValue('translation')

    const result = labelResolver.resolve(activatedRouteSpy, routerStateSpy)

    expect(result).toBe('translation')
    expect(translateServiceSpy.instant).toHaveBeenCalledOnceWith('defined')
  })

  it('should use route path if breadcrumb is not present', () => {
    const result = labelResolver.resolve(activatedRouteSpy, routerStateSpy)

    expect(result).toBe('path')
    expect(translateServiceSpy.instant).toHaveBeenCalledTimes(0)
  })
})
