import { IAuthService, UserProfile } from '@onecx/portal-integration-angular'
import { BehaviorSubject } from 'rxjs'

export class IAuthMockService implements IAuthService {
  currentUser$ = new BehaviorSubject<UserProfile | undefined>(undefined)
  getCurrentUser(): UserProfile | null {
    return null
  }
  logout(): void {}
  hasPermission(permissionKey: string): boolean {
    return false
  }
  getAuthProviderName(): string {
    return 'mock'
  }
  hasRole(role: string | string[]): boolean {
    return false
  }
  init(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      resolve(false)
    })
  }
  getUserRoles(): string[] {
    return []
  }
}
