/**
 * tkit-portal-server API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 4.4.0-SNAPSHOT
 *
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */
/* tslint:disable:no-unused-variable member-ordering */

import { Inject, Injectable, Optional } from '@angular/core'
import {
  HttpClient,
  HttpHeaders,
  HttpParams,
  HttpResponse,
  HttpEvent,
  HttpParameterCodec,
  HttpContext,
} from '@angular/common/http'
import { CustomHttpParameterCodec } from '../encoder'
import { Observable } from 'rxjs'

// @ts-ignore
import { AccountSettingsDTOv1 } from '../model/accountSettingsDTOv1'
// @ts-ignore
import { PreferencesDTOv1 } from '../model/preferencesDTOv1'
// @ts-ignore
import { ResetPasswordDTOv1 } from '../model/resetPasswordDTOv1'
// @ts-ignore
import { RestException } from '../model/restException'
// @ts-ignore
import { RestExceptionDTO } from '../model/restExceptionDTO'
// @ts-ignore
import { UserPersonDTOv1 } from '../model/userPersonDTOv1'
// @ts-ignore
import { UserProfileDTOv1 } from '../model/userProfileDTOv1'

// @ts-ignore
import { BASE_PATH, COLLECTION_FORMATS } from '../variables'
import { Configuration } from '../configuration'

export interface DeleteUserPreferenceRequestParams {
  preferenceId: string
}

export interface GetUserProfileRequestParams {
  applicationIds?: Array<string>
}

export interface PatchUserPreferenceRequestParams {
  preferenceId: string
  body?: string
}

export interface ResetKeycloakUserPasswordRequestParams {
  resetPasswordDTOv1?: ResetPasswordDTOv1
}

export interface StoreUserPreferenceRequestParams {
  preferencesDTOv1?: PreferencesDTOv1
}

export interface UpdateUserPersonRequestParams {
  userPersonDTOv1?: UserPersonDTOv1
}

export interface UpdateUserSettingsRequestParams {
  accountSettingsDTOv1?: AccountSettingsDTOv1
}

@Injectable({
  providedIn: 'any',
})
export class UserProfileV1APIService {
  protected basePath = 'http://localhost'
  public defaultHeaders = new HttpHeaders()
  public configuration = new Configuration()
  public encoder: HttpParameterCodec

  constructor(
    protected httpClient: HttpClient,
    @Optional() @Inject(BASE_PATH) basePath: string,
    @Optional() configuration: Configuration
  ) {
    if (configuration) {
      this.configuration = configuration
    }
    if (typeof this.configuration.basePath !== 'string') {
      if (typeof basePath !== 'string') {
        basePath = this.basePath
      }
      this.configuration.basePath = basePath
    }
    this.encoder = this.configuration.encoder || new CustomHttpParameterCodec()
  }

  // @ts-ignore
  private addToHttpParams(httpParams: HttpParams, value: any, key?: string): HttpParams {
    if (typeof value === 'object' && value instanceof Date === false) {
      httpParams = this.addToHttpParamsRecursive(httpParams, value)
    } else {
      httpParams = this.addToHttpParamsRecursive(httpParams, value, key)
    }
    return httpParams
  }

  private addToHttpParamsRecursive(httpParams: HttpParams, value?: any, key?: string): HttpParams {
    if (value == null) {
      return httpParams
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        ;(value as any[]).forEach((elem) => (httpParams = this.addToHttpParamsRecursive(httpParams, elem, key)))
      } else if (value instanceof Date) {
        if (key != null) {
          httpParams = httpParams.append(key, (value as Date).toISOString().substr(0, 10))
        } else {
          throw Error('key may not be null if value is Date')
        }
      } else {
        Object.keys(value).forEach(
          (k) => (httpParams = this.addToHttpParamsRecursive(httpParams, value[k], key != null ? `${key}.${k}` : k))
        )
      }
    } else if (key != null) {
      httpParams = httpParams.append(key, value)
    } else {
      throw Error('key may not be null if value is not object or array')
    }
    return httpParams
  }

  /**
   * Delete user\&#39;s preference
   * @param requestParameters
   * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
   * @param reportProgress flag to report request and response progress.
   */
  public deleteUserPreference(
    requestParameters: DeleteUserPreferenceRequestParams,
    observe?: 'body',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<PreferencesDTOv1>
  public deleteUserPreference(
    requestParameters: DeleteUserPreferenceRequestParams,
    observe?: 'response',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<HttpResponse<PreferencesDTOv1>>
  public deleteUserPreference(
    requestParameters: DeleteUserPreferenceRequestParams,
    observe?: 'events',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<HttpEvent<PreferencesDTOv1>>
  public deleteUserPreference(
    requestParameters: DeleteUserPreferenceRequestParams,
    observe: any = 'body',
    reportProgress: boolean = false,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<any> {
    const preferenceId = requestParameters.preferenceId
    if (preferenceId === null || preferenceId === undefined) {
      throw new Error('Required parameter preferenceId was null or undefined when calling deleteUserPreference.')
    }

    let localVarHeaders = this.defaultHeaders

    let localVarHttpHeaderAcceptSelected: string | undefined = options && options.httpHeaderAccept
    if (localVarHttpHeaderAcceptSelected === undefined) {
      // to determine the Accept header
      const httpHeaderAccepts: string[] = ['application/json']
      localVarHttpHeaderAcceptSelected = this.configuration.selectHeaderAccept(httpHeaderAccepts)
    }
    if (localVarHttpHeaderAcceptSelected !== undefined) {
      localVarHeaders = localVarHeaders.set('Accept', localVarHttpHeaderAcceptSelected)
    }

    let localVarHttpContext: HttpContext | undefined = options && options.context
    if (localVarHttpContext === undefined) {
      localVarHttpContext = new HttpContext()
    }

    let responseType_: 'text' | 'json' | 'blob' = 'json'
    if (localVarHttpHeaderAcceptSelected) {
      if (localVarHttpHeaderAcceptSelected.startsWith('text')) {
        responseType_ = 'text'
      } else if (this.configuration.isJsonMime(localVarHttpHeaderAcceptSelected)) {
        responseType_ = 'json'
      } else {
        responseType_ = 'blob'
      }
    }

    return this.httpClient.delete<PreferencesDTOv1>(
      `${this.configuration.basePath}/v1/userProfile/me/preference/${encodeURIComponent(String(preferenceId))}`,
      {
        context: localVarHttpContext,
        responseType: <any>responseType_,
        withCredentials: this.configuration.withCredentials,
        headers: localVarHeaders,
        observe: observe,
        reportProgress: reportProgress,
      }
    )
  }

  /**
   * Delete current user
   * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
   * @param reportProgress flag to report request and response progress.
   */
  public deleteUserProfile(
    observe?: 'body',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<any>
  public deleteUserProfile(
    observe?: 'response',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<HttpResponse<any>>
  public deleteUserProfile(
    observe?: 'events',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<HttpEvent<any>>
  public deleteUserProfile(
    observe: any = 'body',
    reportProgress: boolean = false,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<any> {
    let localVarHeaders = this.defaultHeaders

    let localVarHttpHeaderAcceptSelected: string | undefined = options && options.httpHeaderAccept
    if (localVarHttpHeaderAcceptSelected === undefined) {
      // to determine the Accept header
      const httpHeaderAccepts: string[] = ['application/json']
      localVarHttpHeaderAcceptSelected = this.configuration.selectHeaderAccept(httpHeaderAccepts)
    }
    if (localVarHttpHeaderAcceptSelected !== undefined) {
      localVarHeaders = localVarHeaders.set('Accept', localVarHttpHeaderAcceptSelected)
    }

    let localVarHttpContext: HttpContext | undefined = options && options.context
    if (localVarHttpContext === undefined) {
      localVarHttpContext = new HttpContext()
    }

    let responseType_: 'text' | 'json' | 'blob' = 'json'
    if (localVarHttpHeaderAcceptSelected) {
      if (localVarHttpHeaderAcceptSelected.startsWith('text')) {
        responseType_ = 'text'
      } else if (this.configuration.isJsonMime(localVarHttpHeaderAcceptSelected)) {
        responseType_ = 'json'
      } else {
        responseType_ = 'blob'
      }
    }

    return this.httpClient.delete<any>(`${this.configuration.basePath}/v1/userProfile/me`, {
      context: localVarHttpContext,
      responseType: <any>responseType_,
      withCredentials: this.configuration.withCredentials,
      headers: localVarHeaders,
      observe: observe,
      reportProgress: reportProgress,
    })
  }

  /**
   * Load user profile by user Id
   * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
   * @param reportProgress flag to report request and response progress.
   */
  public getUserPerson(
    observe?: 'body',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<UserPersonDTOv1>
  public getUserPerson(
    observe?: 'response',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<HttpResponse<UserPersonDTOv1>>
  public getUserPerson(
    observe?: 'events',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<HttpEvent<UserPersonDTOv1>>
  public getUserPerson(
    observe: any = 'body',
    reportProgress: boolean = false,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<any> {
    let localVarHeaders = this.defaultHeaders

    let localVarHttpHeaderAcceptSelected: string | undefined = options && options.httpHeaderAccept
    if (localVarHttpHeaderAcceptSelected === undefined) {
      // to determine the Accept header
      const httpHeaderAccepts: string[] = ['application/json']
      localVarHttpHeaderAcceptSelected = this.configuration.selectHeaderAccept(httpHeaderAccepts)
    }
    if (localVarHttpHeaderAcceptSelected !== undefined) {
      localVarHeaders = localVarHeaders.set('Accept', localVarHttpHeaderAcceptSelected)
    }

    let localVarHttpContext: HttpContext | undefined = options && options.context
    if (localVarHttpContext === undefined) {
      localVarHttpContext = new HttpContext()
    }

    let responseType_: 'text' | 'json' | 'blob' = 'json'
    if (localVarHttpHeaderAcceptSelected) {
      if (localVarHttpHeaderAcceptSelected.startsWith('text')) {
        responseType_ = 'text'
      } else if (this.configuration.isJsonMime(localVarHttpHeaderAcceptSelected)) {
        responseType_ = 'json'
      } else {
        responseType_ = 'blob'
      }
    }

    return this.httpClient.get<UserPersonDTOv1>(`${this.configuration.basePath}/v1/userProfile/me/userPerson`, {
      context: localVarHttpContext,
      responseType: <any>responseType_,
      withCredentials: this.configuration.withCredentials,
      headers: localVarHeaders,
      observe: observe,
      reportProgress: reportProgress,
    })
  }

  /**
   * Get user\&#39;s preferences
   * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
   * @param reportProgress flag to report request and response progress.
   */
  public getUserPreferences(
    observe?: 'body',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<Array<PreferencesDTOv1>>
  public getUserPreferences(
    observe?: 'response',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<HttpResponse<Array<PreferencesDTOv1>>>
  public getUserPreferences(
    observe?: 'events',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<HttpEvent<Array<PreferencesDTOv1>>>
  public getUserPreferences(
    observe: any = 'body',
    reportProgress: boolean = false,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<any> {
    let localVarHeaders = this.defaultHeaders

    let localVarHttpHeaderAcceptSelected: string | undefined = options && options.httpHeaderAccept
    if (localVarHttpHeaderAcceptSelected === undefined) {
      // to determine the Accept header
      const httpHeaderAccepts: string[] = ['application/json']
      localVarHttpHeaderAcceptSelected = this.configuration.selectHeaderAccept(httpHeaderAccepts)
    }
    if (localVarHttpHeaderAcceptSelected !== undefined) {
      localVarHeaders = localVarHeaders.set('Accept', localVarHttpHeaderAcceptSelected)
    }

    let localVarHttpContext: HttpContext | undefined = options && options.context
    if (localVarHttpContext === undefined) {
      localVarHttpContext = new HttpContext()
    }

    let responseType_: 'text' | 'json' | 'blob' = 'json'
    if (localVarHttpHeaderAcceptSelected) {
      if (localVarHttpHeaderAcceptSelected.startsWith('text')) {
        responseType_ = 'text'
      } else if (this.configuration.isJsonMime(localVarHttpHeaderAcceptSelected)) {
        responseType_ = 'json'
      } else {
        responseType_ = 'blob'
      }
    }

    return this.httpClient.get<Array<PreferencesDTOv1>>(
      `${this.configuration.basePath}/v1/userProfile/me/preferences`,
      {
        context: localVarHttpContext,
        responseType: <any>responseType_,
        withCredentials: this.configuration.withCredentials,
        headers: localVarHeaders,
        observe: observe,
        reportProgress: reportProgress,
      }
    )
  }

  /**
   * Load user profile by user Id
   * @param requestParameters
   * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
   * @param reportProgress flag to report request and response progress.
   */
  public getUserProfile(
    requestParameters: GetUserProfileRequestParams,
    observe?: 'body',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<UserProfileDTOv1>
  public getUserProfile(
    requestParameters: GetUserProfileRequestParams,
    observe?: 'response',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<HttpResponse<UserProfileDTOv1>>
  public getUserProfile(
    requestParameters: GetUserProfileRequestParams,
    observe?: 'events',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<HttpEvent<UserProfileDTOv1>>
  public getUserProfile(
    requestParameters: GetUserProfileRequestParams,
    observe: any = 'body',
    reportProgress: boolean = false,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<any> {
    const applicationIds = requestParameters.applicationIds

    let localVarQueryParameters = new HttpParams({ encoder: this.encoder })
    if (applicationIds) {
      applicationIds.forEach((element) => {
        localVarQueryParameters = this.addToHttpParams(localVarQueryParameters, <any>element, 'applicationIds')
      })
    }

    let localVarHeaders = this.defaultHeaders

    let localVarHttpHeaderAcceptSelected: string | undefined = options && options.httpHeaderAccept
    if (localVarHttpHeaderAcceptSelected === undefined) {
      // to determine the Accept header
      const httpHeaderAccepts: string[] = ['application/json']
      localVarHttpHeaderAcceptSelected = this.configuration.selectHeaderAccept(httpHeaderAccepts)
    }
    if (localVarHttpHeaderAcceptSelected !== undefined) {
      localVarHeaders = localVarHeaders.set('Accept', localVarHttpHeaderAcceptSelected)
    }

    let localVarHttpContext: HttpContext | undefined = options && options.context
    if (localVarHttpContext === undefined) {
      localVarHttpContext = new HttpContext()
    }

    let responseType_: 'text' | 'json' | 'blob' = 'json'
    if (localVarHttpHeaderAcceptSelected) {
      if (localVarHttpHeaderAcceptSelected.startsWith('text')) {
        responseType_ = 'text'
      } else if (this.configuration.isJsonMime(localVarHttpHeaderAcceptSelected)) {
        responseType_ = 'json'
      } else {
        responseType_ = 'blob'
      }
    }

    return this.httpClient.get<UserProfileDTOv1>(`${this.configuration.basePath}/v1/userProfile/me`, {
      context: localVarHttpContext,
      params: localVarQueryParameters,
      responseType: <any>responseType_,
      withCredentials: this.configuration.withCredentials,
      headers: localVarHeaders,
      observe: observe,
      reportProgress: reportProgress,
    })
  }

  /**
   * Get user\&#39;s settings
   * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
   * @param reportProgress flag to report request and response progress.
   */
  public getUserSettings(
    observe?: 'body',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<AccountSettingsDTOv1>
  public getUserSettings(
    observe?: 'response',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<HttpResponse<AccountSettingsDTOv1>>
  public getUserSettings(
    observe?: 'events',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<HttpEvent<AccountSettingsDTOv1>>
  public getUserSettings(
    observe: any = 'body',
    reportProgress: boolean = false,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<any> {
    let localVarHeaders = this.defaultHeaders

    let localVarHttpHeaderAcceptSelected: string | undefined = options && options.httpHeaderAccept
    if (localVarHttpHeaderAcceptSelected === undefined) {
      // to determine the Accept header
      const httpHeaderAccepts: string[] = ['application/json']
      localVarHttpHeaderAcceptSelected = this.configuration.selectHeaderAccept(httpHeaderAccepts)
    }
    if (localVarHttpHeaderAcceptSelected !== undefined) {
      localVarHeaders = localVarHeaders.set('Accept', localVarHttpHeaderAcceptSelected)
    }

    let localVarHttpContext: HttpContext | undefined = options && options.context
    if (localVarHttpContext === undefined) {
      localVarHttpContext = new HttpContext()
    }

    let responseType_: 'text' | 'json' | 'blob' = 'json'
    if (localVarHttpHeaderAcceptSelected) {
      if (localVarHttpHeaderAcceptSelected.startsWith('text')) {
        responseType_ = 'text'
      } else if (this.configuration.isJsonMime(localVarHttpHeaderAcceptSelected)) {
        responseType_ = 'json'
      } else {
        responseType_ = 'blob'
      }
    }

    return this.httpClient.get<AccountSettingsDTOv1>(`${this.configuration.basePath}/v1/userProfile/me/settings`, {
      context: localVarHttpContext,
      responseType: <any>responseType_,
      withCredentials: this.configuration.withCredentials,
      headers: localVarHeaders,
      observe: observe,
      reportProgress: reportProgress,
    })
  }

  /**
   * Patch user\&#39;s preference
   * @param requestParameters
   * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
   * @param reportProgress flag to report request and response progress.
   */
  public patchUserPreference(
    requestParameters: PatchUserPreferenceRequestParams,
    observe?: 'body',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<PreferencesDTOv1>
  public patchUserPreference(
    requestParameters: PatchUserPreferenceRequestParams,
    observe?: 'response',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<HttpResponse<PreferencesDTOv1>>
  public patchUserPreference(
    requestParameters: PatchUserPreferenceRequestParams,
    observe?: 'events',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<HttpEvent<PreferencesDTOv1>>
  public patchUserPreference(
    requestParameters: PatchUserPreferenceRequestParams,
    observe: any = 'body',
    reportProgress: boolean = false,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<any> {
    const preferenceId = requestParameters.preferenceId
    if (preferenceId === null || preferenceId === undefined) {
      throw new Error('Required parameter preferenceId was null or undefined when calling patchUserPreference.')
    }
    const body = requestParameters.body

    let localVarHeaders = this.defaultHeaders

    let localVarHttpHeaderAcceptSelected: string | undefined = options && options.httpHeaderAccept
    if (localVarHttpHeaderAcceptSelected === undefined) {
      // to determine the Accept header
      const httpHeaderAccepts: string[] = ['application/json']
      localVarHttpHeaderAcceptSelected = this.configuration.selectHeaderAccept(httpHeaderAccepts)
    }
    if (localVarHttpHeaderAcceptSelected !== undefined) {
      localVarHeaders = localVarHeaders.set('Accept', localVarHttpHeaderAcceptSelected)
    }

    let localVarHttpContext: HttpContext | undefined = options && options.context
    if (localVarHttpContext === undefined) {
      localVarHttpContext = new HttpContext()
    }

    // to determine the Content-Type header
    const consumes: string[] = ['application/json']
    const httpContentTypeSelected: string | undefined = this.configuration.selectHeaderContentType(consumes)
    if (httpContentTypeSelected !== undefined) {
      localVarHeaders = localVarHeaders.set('Content-Type', httpContentTypeSelected)
    }

    let responseType_: 'text' | 'json' | 'blob' = 'json'
    if (localVarHttpHeaderAcceptSelected) {
      if (localVarHttpHeaderAcceptSelected.startsWith('text')) {
        responseType_ = 'text'
      } else if (this.configuration.isJsonMime(localVarHttpHeaderAcceptSelected)) {
        responseType_ = 'json'
      } else {
        responseType_ = 'blob'
      }
    }

    return this.httpClient.patch<PreferencesDTOv1>(
      `${this.configuration.basePath}/v1/userProfile/me/preference/${encodeURIComponent(String(preferenceId))}`,
      body,
      {
        context: localVarHttpContext,
        responseType: <any>responseType_,
        withCredentials: this.configuration.withCredentials,
        headers: localVarHeaders,
        observe: observe,
        reportProgress: reportProgress,
      }
    )
  }

  /**
   * Reset Keycloak User\&#39;s password
   * The password of user registered in keycloak is set to the new one.
   * @param requestParameters
   * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
   * @param reportProgress flag to report request and response progress.
   */
  public resetKeycloakUserPassword(
    requestParameters: ResetKeycloakUserPasswordRequestParams,
    observe?: 'body',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: undefined; context?: HttpContext }
  ): Observable<any>
  public resetKeycloakUserPassword(
    requestParameters: ResetKeycloakUserPasswordRequestParams,
    observe?: 'response',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: undefined; context?: HttpContext }
  ): Observable<HttpResponse<any>>
  public resetKeycloakUserPassword(
    requestParameters: ResetKeycloakUserPasswordRequestParams,
    observe?: 'events',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: undefined; context?: HttpContext }
  ): Observable<HttpEvent<any>>
  public resetKeycloakUserPassword(
    requestParameters: ResetKeycloakUserPasswordRequestParams,
    observe: any = 'body',
    reportProgress: boolean = false,
    options?: { httpHeaderAccept?: undefined; context?: HttpContext }
  ): Observable<any> {
    const resetPasswordDTOv1 = requestParameters.resetPasswordDTOv1

    let localVarHeaders = this.defaultHeaders

    let localVarHttpHeaderAcceptSelected: string | undefined = options && options.httpHeaderAccept
    if (localVarHttpHeaderAcceptSelected === undefined) {
      // to determine the Accept header
      const httpHeaderAccepts: string[] = []
      localVarHttpHeaderAcceptSelected = this.configuration.selectHeaderAccept(httpHeaderAccepts)
    }
    if (localVarHttpHeaderAcceptSelected !== undefined) {
      localVarHeaders = localVarHeaders.set('Accept', localVarHttpHeaderAcceptSelected)
    }

    let localVarHttpContext: HttpContext | undefined = options && options.context
    if (localVarHttpContext === undefined) {
      localVarHttpContext = new HttpContext()
    }

    // to determine the Content-Type header
    const consumes: string[] = ['application/json']
    const httpContentTypeSelected: string | undefined = this.configuration.selectHeaderContentType(consumes)
    if (httpContentTypeSelected !== undefined) {
      localVarHeaders = localVarHeaders.set('Content-Type', httpContentTypeSelected)
    }

    let responseType_: 'text' | 'json' | 'blob' = 'json'
    if (localVarHttpHeaderAcceptSelected) {
      if (localVarHttpHeaderAcceptSelected.startsWith('text')) {
        responseType_ = 'text'
      } else if (this.configuration.isJsonMime(localVarHttpHeaderAcceptSelected)) {
        responseType_ = 'json'
      } else {
        responseType_ = 'blob'
      }
    }

    return this.httpClient.put<any>(
      `${this.configuration.basePath}/v1/userProfile/me/change-password`,
      resetPasswordDTOv1,
      {
        context: localVarHttpContext,
        responseType: <any>responseType_,
        withCredentials: this.configuration.withCredentials,
        headers: localVarHeaders,
        observe: observe,
        reportProgress: reportProgress,
      }
    )
  }

  /**
   * Store user\&#39;s preference
   * @param requestParameters
   * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
   * @param reportProgress flag to report request and response progress.
   */
  public storeUserPreference(
    requestParameters: StoreUserPreferenceRequestParams,
    observe?: 'body',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<PreferencesDTOv1>
  public storeUserPreference(
    requestParameters: StoreUserPreferenceRequestParams,
    observe?: 'response',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<HttpResponse<PreferencesDTOv1>>
  public storeUserPreference(
    requestParameters: StoreUserPreferenceRequestParams,
    observe?: 'events',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<HttpEvent<PreferencesDTOv1>>
  public storeUserPreference(
    requestParameters: StoreUserPreferenceRequestParams,
    observe: any = 'body',
    reportProgress: boolean = false,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<any> {
    const preferencesDTOv1 = requestParameters.preferencesDTOv1

    let localVarHeaders = this.defaultHeaders

    let localVarHttpHeaderAcceptSelected: string | undefined = options && options.httpHeaderAccept
    if (localVarHttpHeaderAcceptSelected === undefined) {
      // to determine the Accept header
      const httpHeaderAccepts: string[] = ['application/json']
      localVarHttpHeaderAcceptSelected = this.configuration.selectHeaderAccept(httpHeaderAccepts)
    }
    if (localVarHttpHeaderAcceptSelected !== undefined) {
      localVarHeaders = localVarHeaders.set('Accept', localVarHttpHeaderAcceptSelected)
    }

    let localVarHttpContext: HttpContext | undefined = options && options.context
    if (localVarHttpContext === undefined) {
      localVarHttpContext = new HttpContext()
    }

    // to determine the Content-Type header
    const consumes: string[] = ['application/json']
    const httpContentTypeSelected: string | undefined = this.configuration.selectHeaderContentType(consumes)
    if (httpContentTypeSelected !== undefined) {
      localVarHeaders = localVarHeaders.set('Content-Type', httpContentTypeSelected)
    }

    let responseType_: 'text' | 'json' | 'blob' = 'json'
    if (localVarHttpHeaderAcceptSelected) {
      if (localVarHttpHeaderAcceptSelected.startsWith('text')) {
        responseType_ = 'text'
      } else if (this.configuration.isJsonMime(localVarHttpHeaderAcceptSelected)) {
        responseType_ = 'json'
      } else {
        responseType_ = 'blob'
      }
    }

    return this.httpClient.post<PreferencesDTOv1>(
      `${this.configuration.basePath}/v1/userProfile/me/preference`,
      preferencesDTOv1,
      {
        context: localVarHttpContext,
        responseType: <any>responseType_,
        withCredentials: this.configuration.withCredentials,
        headers: localVarHeaders,
        observe: observe,
        reportProgress: reportProgress,
      }
    )
  }

  /**
   * Update user person data
   * @param requestParameters
   * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
   * @param reportProgress flag to report request and response progress.
   */
  public updateUserPerson(
    requestParameters: UpdateUserPersonRequestParams,
    observe?: 'body',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'text/plain' | 'application/json'; context?: HttpContext }
  ): Observable<string>
  public updateUserPerson(
    requestParameters: UpdateUserPersonRequestParams,
    observe?: 'response',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'text/plain' | 'application/json'; context?: HttpContext }
  ): Observable<HttpResponse<string>>
  public updateUserPerson(
    requestParameters: UpdateUserPersonRequestParams,
    observe?: 'events',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'text/plain' | 'application/json'; context?: HttpContext }
  ): Observable<HttpEvent<string>>
  public updateUserPerson(
    requestParameters: UpdateUserPersonRequestParams,
    observe: any = 'body',
    reportProgress: boolean = false,
    options?: { httpHeaderAccept?: 'text/plain' | 'application/json'; context?: HttpContext }
  ): Observable<any> {
    const userPersonDTOv1 = requestParameters.userPersonDTOv1

    let localVarHeaders = this.defaultHeaders

    let localVarHttpHeaderAcceptSelected: string | undefined = options && options.httpHeaderAccept
    if (localVarHttpHeaderAcceptSelected === undefined) {
      // to determine the Accept header
      const httpHeaderAccepts: string[] = ['text/plain', 'application/json']
      localVarHttpHeaderAcceptSelected = this.configuration.selectHeaderAccept(httpHeaderAccepts)
    }
    if (localVarHttpHeaderAcceptSelected !== undefined) {
      localVarHeaders = localVarHeaders.set('Accept', localVarHttpHeaderAcceptSelected)
    }

    let localVarHttpContext: HttpContext | undefined = options && options.context
    if (localVarHttpContext === undefined) {
      localVarHttpContext = new HttpContext()
    }

    // to determine the Content-Type header
    const consumes: string[] = ['application/json']
    const httpContentTypeSelected: string | undefined = this.configuration.selectHeaderContentType(consumes)
    if (httpContentTypeSelected !== undefined) {
      localVarHeaders = localVarHeaders.set('Content-Type', httpContentTypeSelected)
    }

    let responseType_: 'text' | 'json' | 'blob' = 'json'
    if (localVarHttpHeaderAcceptSelected) {
      if (localVarHttpHeaderAcceptSelected.startsWith('text')) {
        responseType_ = 'text'
      } else if (this.configuration.isJsonMime(localVarHttpHeaderAcceptSelected)) {
        responseType_ = 'json'
      } else {
        responseType_ = 'blob'
      }
    }

    return this.httpClient.put<string>(`${this.configuration.basePath}/v1/userProfile/me/userPerson`, userPersonDTOv1, {
      context: localVarHttpContext,
      responseType: <any>responseType_,
      withCredentials: this.configuration.withCredentials,
      headers: localVarHeaders,
      observe: observe,
      reportProgress: reportProgress,
    })
  }

  /**
   * Update user\&#39;s settings
   * @param requestParameters
   * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
   * @param reportProgress flag to report request and response progress.
   */
  public updateUserSettings(
    requestParameters: UpdateUserSettingsRequestParams,
    observe?: 'body',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<AccountSettingsDTOv1>
  public updateUserSettings(
    requestParameters: UpdateUserSettingsRequestParams,
    observe?: 'response',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<HttpResponse<AccountSettingsDTOv1>>
  public updateUserSettings(
    requestParameters: UpdateUserSettingsRequestParams,
    observe?: 'events',
    reportProgress?: boolean,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<HttpEvent<AccountSettingsDTOv1>>
  public updateUserSettings(
    requestParameters: UpdateUserSettingsRequestParams,
    observe: any = 'body',
    reportProgress: boolean = false,
    options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext }
  ): Observable<any> {
    const accountSettingsDTOv1 = requestParameters.accountSettingsDTOv1

    let localVarHeaders = this.defaultHeaders

    let localVarHttpHeaderAcceptSelected: string | undefined = options && options.httpHeaderAccept
    if (localVarHttpHeaderAcceptSelected === undefined) {
      // to determine the Accept header
      const httpHeaderAccepts: string[] = ['application/json']
      localVarHttpHeaderAcceptSelected = this.configuration.selectHeaderAccept(httpHeaderAccepts)
    }
    if (localVarHttpHeaderAcceptSelected !== undefined) {
      localVarHeaders = localVarHeaders.set('Accept', localVarHttpHeaderAcceptSelected)
    }

    let localVarHttpContext: HttpContext | undefined = options && options.context
    if (localVarHttpContext === undefined) {
      localVarHttpContext = new HttpContext()
    }

    // to determine the Content-Type header
    const consumes: string[] = ['application/json']
    const httpContentTypeSelected: string | undefined = this.configuration.selectHeaderContentType(consumes)
    if (httpContentTypeSelected !== undefined) {
      localVarHeaders = localVarHeaders.set('Content-Type', httpContentTypeSelected)
    }

    let responseType_: 'text' | 'json' | 'blob' = 'json'
    if (localVarHttpHeaderAcceptSelected) {
      if (localVarHttpHeaderAcceptSelected.startsWith('text')) {
        responseType_ = 'text'
      } else if (this.configuration.isJsonMime(localVarHttpHeaderAcceptSelected)) {
        responseType_ = 'json'
      } else {
        responseType_ = 'blob'
      }
    }

    return this.httpClient.patch<AccountSettingsDTOv1>(
      `${this.configuration.basePath}/v1/userProfile/me/settings`,
      accountSettingsDTOv1,
      {
        context: localVarHttpContext,
        responseType: <any>responseType_,
        withCredentials: this.configuration.withCredentials,
        headers: localVarHeaders,
        observe: observe,
        reportProgress: reportProgress,
      }
    )
  }
}
