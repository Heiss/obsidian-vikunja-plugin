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
/**
 * 
 * @export
 * @interface ModelsTaskCollection
 */
export interface ModelsTaskCollection {
    /**
     * The filter query to match tasks by. Check out https://vikunja.io/docs/filters for a full explanation.
     * @type {string}
     * @memberof ModelsTaskCollection
     */
    filter?: string;
    /**
     * If set to true, the result will also include null values
     * @type {boolean}
     * @memberof ModelsTaskCollection
     */
    filterIncludeNulls?: boolean;
    /**
     * The query parameter to order the items by. This can be either asc or desc, with asc being the default.
     * @type {Array<string>}
     * @memberof ModelsTaskCollection
     */
    orderBy?: Array<string>;
    /**
     * The query parameter to sort by. This is for ex. done, priority, etc.
     * @type {Array<string>}
     * @memberof ModelsTaskCollection
     */
    sortBy?: Array<string>;
}

/**
 * Check if a given object implements the ModelsTaskCollection interface.
 */
export function instanceOfModelsTaskCollection(value: object): value is ModelsTaskCollection {
    return true;
}

export function ModelsTaskCollectionFromJSON(json: any): ModelsTaskCollection {
    return ModelsTaskCollectionFromJSONTyped(json, false);
}

export function ModelsTaskCollectionFromJSONTyped(json: any, ignoreDiscriminator: boolean): ModelsTaskCollection {
    if (json == null) {
        return json;
    }
    return {
        
        'filter': json['filter'] == null ? undefined : json['filter'],
        'filterIncludeNulls': json['filter_include_nulls'] == null ? undefined : json['filter_include_nulls'],
        'orderBy': json['order_by'] == null ? undefined : json['order_by'],
        'sortBy': json['sort_by'] == null ? undefined : json['sort_by'],
    };
}

export function ModelsTaskCollectionToJSON(value?: ModelsTaskCollection | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'filter': value['filter'],
        'filter_include_nulls': value['filterIncludeNulls'],
        'order_by': value['orderBy'],
        'sort_by': value['sortBy'],
    };
}

