/**
 * onecx-workspace-bff
 * OneCX Workspace BFF
 *
 * The version of the OpenAPI document: 1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */
import { MicrofrontendType } from './microfrontendType';
import { UIEndpoint } from './uIEndpoint';


export interface MicrofrontendPS { 
    appId?: string;
    appName?: string;
    appVersion?: string;
    deprecated?: boolean;
    undeployed?: boolean;
    type?: MicrofrontendType;
    exposedModule?: string;
    endpoints?: Array<UIEndpoint>;
}



