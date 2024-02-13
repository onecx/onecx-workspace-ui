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
import { Scope } from './scope';


export interface MenuItem { 
    modificationCount?: number;
    creationDate?: string;
    creationUser?: string;
    modificationDate?: string;
    modificationUser?: string;
    id: string;
    key?: string;
    name?: string;
    description?: string;
    url?: string;
    workspaceName?: string;
    applicationId?: string;
    disabled?: boolean;
    position?: number;
    permission?: string;
    badge?: string;
    scope?: Scope;
    workspaceExit?: boolean;
    parentItemId?: string;
    children?: Array<MenuItem>;
    i18n?: { [key: string]: string; };
}



