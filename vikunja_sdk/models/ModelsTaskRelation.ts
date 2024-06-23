/* tslint:disable */
/* eslint-disable */
/**
 * Vikunja API
 * # Pagination Every endpoint capable of pagination will return two headers: * `x-pagination-total-pages`: The total number of available pages for this request * `x-pagination-result-count`: The number of items returned for this request. # Rights All endpoints which return a single item (project, task, etc.) - no array - will also return a `x-max-right` header with the max right the user has on this item as an int where `0` is `Read Only`, `1` is `Read & Write` and `2` is `Admin`. This can be used to show or hide ui elements based on the rights the user has. # Errors All errors have an error code and a human-readable error message in addition to the http status code. You should always check for the status code in the response, not only the http status code. Due to limitations in the swagger library we\'re using for this document, only one error per http status code is documented here. Make sure to check the [error docs](https://vikunja.io/docs/errors/) in Vikunja\'s documentation for a full list of available error codes. # Authorization **JWT-Auth:** Main authorization method, used for most of the requests. Needs `Authorization: Bearer <jwt-token>`-header to authenticate successfully.  **API Token:** You can create scoped API tokens for your user and use the token to make authenticated requests in the context of that user. The token must be provided via an `Authorization: Bearer <token>` header, similar to jwt auth. See the documentation for the `api` group to manage token creation and revocation.  **BasicAuth:** Only used when requesting tasks via CalDAV. <!-- ReDoc-Inject: <security-definitions> -->
 *
 * The version of the OpenAPI document: v0.23.0-879-f2ac9c2cca
 * Contact: hello@vikunja.io
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from '../runtime';
import type { ModelsRelationKind } from './ModelsRelationKind';
import {
    ModelsRelationKindFromJSON,
    ModelsRelationKindFromJSONTyped,
    ModelsRelationKindToJSON,
} from './ModelsRelationKind';
import type { UserUser } from './UserUser';
import {
    UserUserFromJSON,
    UserUserFromJSONTyped,
    UserUserToJSON,
} from './UserUser';

/**
 * 
 * @export
 * @interface ModelsTaskRelation
 */
export interface ModelsTaskRelation {
    /**
     * A timestamp when this label was created. You cannot change this value.
     * @type {string}
     * @memberof ModelsTaskRelation
     */
    created?: string;
    /**
     * The user who created this relation
     * @type {UserUser}
     * @memberof ModelsTaskRelation
     */
    createdBy?: UserUser;
    /**
     * The ID of the other task, the task which is being related.
     * @type {number}
     * @memberof ModelsTaskRelation
     */
    otherTaskId?: number;
    /**
     * The kind of the relation.
     * @type {ModelsRelationKind}
     * @memberof ModelsTaskRelation
     */
    relationKind?: ModelsRelationKind;
    /**
     * The ID of the "base" task, the task which has a relation to another.
     * @type {number}
     * @memberof ModelsTaskRelation
     */
    taskId?: number;
}

/**
 * Check if a given object implements the ModelsTaskRelation interface.
 */
export function instanceOfModelsTaskRelation(value: object): value is ModelsTaskRelation {
    return true;
}

export function ModelsTaskRelationFromJSON(json: any): ModelsTaskRelation {
    return ModelsTaskRelationFromJSONTyped(json, false);
}

export function ModelsTaskRelationFromJSONTyped(json: any, ignoreDiscriminator: boolean): ModelsTaskRelation {
    if (json == null) {
        return json;
    }
    return {
        
        'created': json['created'] == null ? undefined : json['created'],
        'createdBy': json['created_by'] == null ? undefined : UserUserFromJSON(json['created_by']),
        'otherTaskId': json['other_task_id'] == null ? undefined : json['other_task_id'],
        'relationKind': json['relation_kind'] == null ? undefined : ModelsRelationKindFromJSON(json['relation_kind']),
        'taskId': json['task_id'] == null ? undefined : json['task_id'],
    };
}

export function ModelsTaskRelationToJSON(value?: ModelsTaskRelation | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'created': value['created'],
        'created_by': UserUserToJSON(value['createdBy']),
        'other_task_id': value['otherTaskId'],
        'relation_kind': ModelsRelationKindToJSON(value['relationKind']),
        'task_id': value['taskId'],
    };
}

