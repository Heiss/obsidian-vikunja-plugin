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
import type { UserUser } from './UserUser';
import {
    UserUserFromJSON,
    UserUserFromJSONTyped,
    UserUserToJSON,
} from './UserUser';

/**
 * 
 * @export
 * @interface ModelsWebhook
 */
export interface ModelsWebhook {
    /**
     * A timestamp when this webhook target was created. You cannot change this value.
     * @type {string}
     * @memberof ModelsWebhook
     */
    created?: string;
    /**
     * The user who initially created the webhook target.
     * @type {UserUser}
     * @memberof ModelsWebhook
     */
    createdBy?: UserUser;
    /**
     * The webhook events which should fire this webhook target
     * @type {Array<string>}
     * @memberof ModelsWebhook
     */
    events?: Array<string>;
    /**
     * The generated ID of this webhook target
     * @type {number}
     * @memberof ModelsWebhook
     */
    id?: number;
    /**
     * The project ID of the project this webhook target belongs to
     * @type {number}
     * @memberof ModelsWebhook
     */
    projectId?: number;
    /**
     * If provided, webhook requests will be signed using HMAC. Check out the docs about how to use this: https://vikunja.io/docs/webhooks/#signing
     * @type {string}
     * @memberof ModelsWebhook
     */
    secret?: string;
    /**
     * The target URL where the POST request with the webhook payload will be made
     * @type {string}
     * @memberof ModelsWebhook
     */
    targetUrl?: string;
    /**
     * A timestamp when this webhook target was last updated. You cannot change this value.
     * @type {string}
     * @memberof ModelsWebhook
     */
    updated?: string;
}

/**
 * Check if a given object implements the ModelsWebhook interface.
 */
export function instanceOfModelsWebhook(value: object): value is ModelsWebhook {
    return true;
}

export function ModelsWebhookFromJSON(json: any): ModelsWebhook {
    return ModelsWebhookFromJSONTyped(json, false);
}

export function ModelsWebhookFromJSONTyped(json: any, ignoreDiscriminator: boolean): ModelsWebhook {
    if (json == null) {
        return json;
    }
    return {
        
        'created': json['created'] == null ? undefined : json['created'],
        'createdBy': json['created_by'] == null ? undefined : UserUserFromJSON(json['created_by']),
        'events': json['events'] == null ? undefined : json['events'],
        'id': json['id'] == null ? undefined : json['id'],
        'projectId': json['project_id'] == null ? undefined : json['project_id'],
        'secret': json['secret'] == null ? undefined : json['secret'],
        'targetUrl': json['target_url'] == null ? undefined : json['target_url'],
        'updated': json['updated'] == null ? undefined : json['updated'],
    };
}

export function ModelsWebhookToJSON(value?: ModelsWebhook | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'created': value['created'],
        'created_by': UserUserToJSON(value['createdBy']),
        'events': value['events'],
        'id': value['id'],
        'project_id': value['projectId'],
        'secret': value['secret'],
        'target_url': value['targetUrl'],
        'updated': value['updated'],
    };
}

