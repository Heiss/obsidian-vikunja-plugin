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
import type { ModelsBucketConfigurationModeKind } from './ModelsBucketConfigurationModeKind';
import {
    ModelsBucketConfigurationModeKindFromJSON,
    ModelsBucketConfigurationModeKindFromJSONTyped,
    ModelsBucketConfigurationModeKindToJSON,
} from './ModelsBucketConfigurationModeKind';
import type { ModelsProjectViewBucketConfiguration } from './ModelsProjectViewBucketConfiguration';
import {
    ModelsProjectViewBucketConfigurationFromJSON,
    ModelsProjectViewBucketConfigurationFromJSONTyped,
    ModelsProjectViewBucketConfigurationToJSON,
} from './ModelsProjectViewBucketConfiguration';
import type { ModelsProjectViewKind } from './ModelsProjectViewKind';
import {
    ModelsProjectViewKindFromJSON,
    ModelsProjectViewKindFromJSONTyped,
    ModelsProjectViewKindToJSON,
} from './ModelsProjectViewKind';

/**
 * 
 * @export
 * @interface ModelsProjectView
 */
export interface ModelsProjectView {
    /**
     * When the bucket configuration mode is not `manual`, this field holds the options of that configuration.
     * @type {Array<ModelsProjectViewBucketConfiguration>}
     * @memberof ModelsProjectView
     */
    bucketConfiguration?: Array<ModelsProjectViewBucketConfiguration>;
    /**
     * The bucket configuration mode. Can be `none`, `manual` or `filter`. `manual` allows to move tasks between buckets as you normally would. `filter` creates buckets based on a filter for each bucket.
     * @type {ModelsBucketConfigurationModeKind}
     * @memberof ModelsProjectView
     */
    bucketConfigurationMode?: ModelsBucketConfigurationModeKind;
    /**
     * A timestamp when this reaction was created. You cannot change this value.
     * @type {string}
     * @memberof ModelsProjectView
     */
    created?: string;
    /**
     * The ID of the bucket where new tasks without a bucket are added to. By default, this is the leftmost bucket in a view.
     * @type {number}
     * @memberof ModelsProjectView
     */
    defaultBucketId?: number;
    /**
     * If tasks are moved to the done bucket, they are marked as done. If they are marked as done individually, they are moved into the done bucket.
     * @type {number}
     * @memberof ModelsProjectView
     */
    doneBucketId?: number;
    /**
     * The filter query to match tasks by. Check out https://vikunja.io/docs/filters for a full explanation.
     * @type {string}
     * @memberof ModelsProjectView
     */
    filter?: string;
    /**
     * The unique numeric id of this view
     * @type {number}
     * @memberof ModelsProjectView
     */
    id?: number;
    /**
     * The position of this view in the list. The list of all views will be sorted by this parameter.
     * @type {number}
     * @memberof ModelsProjectView
     */
    position?: number;
    /**
     * The project this view belongs to
     * @type {number}
     * @memberof ModelsProjectView
     */
    projectId?: number;
    /**
     * The title of this view
     * @type {string}
     * @memberof ModelsProjectView
     */
    title?: string;
    /**
     * A timestamp when this view was updated. You cannot change this value.
     * @type {string}
     * @memberof ModelsProjectView
     */
    updated?: string;
    /**
     * The kind of this view. Can be `list`, `gantt`, `table` or `kanban`.
     * @type {ModelsProjectViewKind}
     * @memberof ModelsProjectView
     */
    viewKind?: ModelsProjectViewKind;
}

/**
 * Check if a given object implements the ModelsProjectView interface.
 */
export function instanceOfModelsProjectView(value: object): value is ModelsProjectView {
    return true;
}

export function ModelsProjectViewFromJSON(json: any): ModelsProjectView {
    return ModelsProjectViewFromJSONTyped(json, false);
}

export function ModelsProjectViewFromJSONTyped(json: any, ignoreDiscriminator: boolean): ModelsProjectView {
    if (json == null) {
        return json;
    }
    return {
        
        'bucketConfiguration': json['bucket_configuration'] == null ? undefined : ((json['bucket_configuration'] as Array<any>).map(ModelsProjectViewBucketConfigurationFromJSON)),
        'bucketConfigurationMode': json['bucket_configuration_mode'] == null ? undefined : ModelsBucketConfigurationModeKindFromJSON(json['bucket_configuration_mode']),
        'created': json['created'] == null ? undefined : json['created'],
        'defaultBucketId': json['default_bucket_id'] == null ? undefined : json['default_bucket_id'],
        'doneBucketId': json['done_bucket_id'] == null ? undefined : json['done_bucket_id'],
        'filter': json['filter'] == null ? undefined : json['filter'],
        'id': json['id'] == null ? undefined : json['id'],
        'position': json['position'] == null ? undefined : json['position'],
        'projectId': json['project_id'] == null ? undefined : json['project_id'],
        'title': json['title'] == null ? undefined : json['title'],
        'updated': json['updated'] == null ? undefined : json['updated'],
        'viewKind': json['view_kind'] == null ? undefined : ModelsProjectViewKindFromJSON(json['view_kind']),
    };
}

export function ModelsProjectViewToJSON(value?: ModelsProjectView | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'bucket_configuration': value['bucketConfiguration'] == null ? undefined : ((value['bucketConfiguration'] as Array<any>).map(ModelsProjectViewBucketConfigurationToJSON)),
        'bucket_configuration_mode': ModelsBucketConfigurationModeKindToJSON(value['bucketConfigurationMode']),
        'created': value['created'],
        'default_bucket_id': value['defaultBucketId'],
        'done_bucket_id': value['doneBucketId'],
        'filter': value['filter'],
        'id': value['id'],
        'position': value['position'],
        'project_id': value['projectId'],
        'title': value['title'],
        'updated': value['updated'],
        'view_kind': ModelsProjectViewKindToJSON(value['viewKind']),
    };
}

