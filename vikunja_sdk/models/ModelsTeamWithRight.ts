/* tslint:disable */
/* eslint-disable */
/**
 * Vikunja API
 * # Pagination Every endpoint capable of pagination will return two headers: * `x-pagination-total-pages`: The total number of available pages for this request * `x-pagination-result-count`: The number of items returned for this request. # Rights All endpoints which return a single item (project, task, etc.) - no array - will also return a `x-max-right` header with the max right the user has on this item as an int where `0` is `Read Only`, `1` is `Read & Write` and `2` is `Admin`. This can be used to show or hide ui elements based on the rights the user has. # Errors All errors have an error code and a human-readable error message in addition to the http status code. You should always check for the status code in the response, not only the http status code. Due to limitations in the swagger library we\'re using for this document, only one error per http status code is documented here. Make sure to check the [error docs](https://vikunja.io/docs/errors/) in Vikunja\'s documentation for a full list of available error codes. # Authorization **JWT-Auth:** Main authorization method, used for most of the requests. Needs `Authorization: Bearer <jwt-token>`-header to authenticate successfully.  **API Token:** You can create scoped API tokens for your user and use the token to make authenticated requests in the context of that user. The token must be provided via an `Authorization: Bearer <token>` header, similar to jwt auth. See the documentation for the `api` group to manage token creation and revocation.  **BasicAuth:** Only used when requesting tasks via CalDAV. <!-- ReDoc-Inject: <security-definitions> -->
 *
 * The version of the OpenAPI document: v0.23.0-832-2d358a57cc
 * Contact: hello@vikunja.io
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from '../runtime';
import type { ModelsRight } from './ModelsRight';
import {
    ModelsRightFromJSON,
    ModelsRightFromJSONTyped,
    ModelsRightToJSON,
} from './ModelsRight';
import type { ModelsTeamUser } from './ModelsTeamUser';
import {
    ModelsTeamUserFromJSON,
    ModelsTeamUserFromJSONTyped,
    ModelsTeamUserToJSON,
} from './ModelsTeamUser';
import type { UserUser } from './UserUser';
import {
    UserUserFromJSON,
    UserUserFromJSONTyped,
    UserUserToJSON,
} from './UserUser';

/**
 * 
 * @export
 * @interface ModelsTeamWithRight
 */
export interface ModelsTeamWithRight {
    /**
     * A timestamp when this relation was created. You cannot change this value.
     * @type {string}
     * @memberof ModelsTeamWithRight
     */
    created?: string;
    /**
     * The user who created this team.
     * @type {UserUser}
     * @memberof ModelsTeamWithRight
     */
    createdBy?: UserUser;
    /**
     * The team's description.
     * @type {string}
     * @memberof ModelsTeamWithRight
     */
    description?: string;
    /**
     * The unique, numeric id of this team.
     * @type {number}
     * @memberof ModelsTeamWithRight
     */
    id?: number;
    /**
     * Query parameter controlling whether to include public projects or not
     * @type {boolean}
     * @memberof ModelsTeamWithRight
     */
    includePublic?: boolean;
    /**
     * Defines wether the team should be publicly discoverable when sharing a project
     * @type {boolean}
     * @memberof ModelsTeamWithRight
     */
    isPublic?: boolean;
    /**
     * An array of all members in this team.
     * @type {Array<ModelsTeamUser>}
     * @memberof ModelsTeamWithRight
     */
    members?: Array<ModelsTeamUser>;
    /**
     * The name of this team.
     * @type {string}
     * @memberof ModelsTeamWithRight
     */
    name?: string;
    /**
     * The team's oidc id delivered by the oidc provider
     * @type {string}
     * @memberof ModelsTeamWithRight
     */
    oidcId?: string;
    /**
     * 
     * @type {ModelsRight}
     * @memberof ModelsTeamWithRight
     */
    right?: ModelsRight;
    /**
     * A timestamp when this relation was last updated. You cannot change this value.
     * @type {string}
     * @memberof ModelsTeamWithRight
     */
    updated?: string;
}

/**
 * Check if a given object implements the ModelsTeamWithRight interface.
 */
export function instanceOfModelsTeamWithRight(value: object): value is ModelsTeamWithRight {
    return true;
}

export function ModelsTeamWithRightFromJSON(json: any): ModelsTeamWithRight {
    return ModelsTeamWithRightFromJSONTyped(json, false);
}

export function ModelsTeamWithRightFromJSONTyped(json: any, ignoreDiscriminator: boolean): ModelsTeamWithRight {
    if (json == null) {
        return json;
    }
    return {
        
        'created': json['created'] == null ? undefined : json['created'],
        'createdBy': json['created_by'] == null ? undefined : UserUserFromJSON(json['created_by']),
        'description': json['description'] == null ? undefined : json['description'],
        'id': json['id'] == null ? undefined : json['id'],
        'includePublic': json['include_public'] == null ? undefined : json['include_public'],
        'isPublic': json['is_public'] == null ? undefined : json['is_public'],
        'members': json['members'] == null ? undefined : ((json['members'] as Array<any>).map(ModelsTeamUserFromJSON)),
        'name': json['name'] == null ? undefined : json['name'],
        'oidcId': json['oidc_id'] == null ? undefined : json['oidc_id'],
        'right': json['right'] == null ? undefined : ModelsRightFromJSON(json['right']),
        'updated': json['updated'] == null ? undefined : json['updated'],
    };
}

export function ModelsTeamWithRightToJSON(value?: ModelsTeamWithRight | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'created': value['created'],
        'created_by': UserUserToJSON(value['createdBy']),
        'description': value['description'],
        'id': value['id'],
        'include_public': value['includePublic'],
        'is_public': value['isPublic'],
        'members': value['members'] == null ? undefined : ((value['members'] as Array<any>).map(ModelsTeamUserToJSON)),
        'name': value['name'],
        'oidc_id': value['oidcId'],
        'right': ModelsRightToJSON(value['right']),
        'updated': value['updated'],
    };
}

