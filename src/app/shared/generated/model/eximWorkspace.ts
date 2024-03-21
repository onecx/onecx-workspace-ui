/**
 * onecx-workspace-bff
 * OneCx workspace Bff
 *
 * The version of the OpenAPI document: 1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */
import { MenuSnapshot } from './menuSnapshot';
import { EximProduct } from './eximProduct';
import { EximWorkspaceAddress } from './eximWorkspaceAddress';


export interface EximWorkspace { 
    name?: string;
    description?: string;
    theme?: string;
    homePage?: string;
    baseUrl?: string;
    companyName?: string;
    phoneNumber?: string;
    rssFeedUrl?: string;
    footerLabel?: string;
    logoUrl?: string;
    products?: Array<EximProduct>;
    address?: EximWorkspaceAddress;
    menu?: MenuSnapshot;
}

