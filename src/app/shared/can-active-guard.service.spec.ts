import { BehaviorSubject, Observable, of } from 'rxjs'
import { CanActivateGuard } from './can-active-guard.service'

let canActivateGuard: CanActivateGuard

describe('CanActivateGuard', () => {
  const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['setDefaultLang', 'use'])

  const configSpy = jasmine.createSpyObj('ConfigurationService', [], { lang$: new BehaviorSubject(undefined) })

  const activatedRouteSpy = jasmine.createSpyObj('ActivatedRouteSnapshot', [], {
    routeConfig: {
      path: 'path'
    }
  })
  const routerStateeSpy = jasmine.createSpyObj('RouterStateSnapshot', [], {
    routeConfig: {
      path: 'path'
    }
  })

  beforeEach(async () => {
    canActivateGuard = new CanActivateGuard(translateServiceSpy, configSpy)
    translateServiceSpy.setDefaultLang.calls.reset()
    translateServiceSpy.use.calls.reset()
  })

  it('should return default lang if provided is not supported', () => {
    const result = canActivateGuard.getBestMatchLanguage('pl')
    expect(result).toBe('en')
  })

  it('should use default language if current not supported and return true', (doneFn: DoneFn) => {
    const langSpy = Object.getOwnPropertyDescriptor(configSpy, 'lang$')?.get as jasmine.Spy<
      () => BehaviorSubject<string>
    >
    langSpy.and.returnValue(new BehaviorSubject('pl'))
    translateServiceSpy.use.and.returnValue(of({}))

    const resultObs = canActivateGuard.canActivate(activatedRouteSpy, routerStateeSpy) as Observable<boolean>
    resultObs.subscribe({
      next: (result) => {
        expect(result).toBe(true)
        doneFn()
      },
      error: () => {
        doneFn.fail
      }
    })

    expect(translateServiceSpy.setDefaultLang).toHaveBeenCalledWith('en')
    expect(translateServiceSpy.use).toHaveBeenCalledWith('en')
  })

  it('should use provided language if current supported and return true', (doneFn: DoneFn) => {
    const langSpy = Object.getOwnPropertyDescriptor(configSpy, 'lang$')?.get as jasmine.Spy<
      () => BehaviorSubject<string>
    >
    langSpy.and.returnValue(new BehaviorSubject('de'))
    translateServiceSpy.use.and.returnValue(of({}))

    const resultObs = canActivateGuard.canActivate(activatedRouteSpy, routerStateeSpy) as Observable<boolean>
    resultObs.subscribe({
      next: (result) => {
        expect(result).toBe(true)
        doneFn()
      },
      error: () => {
        doneFn.fail
      }
    })

    expect(translateServiceSpy.setDefaultLang).toHaveBeenCalledWith('en')
    expect(translateServiceSpy.use).toHaveBeenCalledWith('de')
  })
})
