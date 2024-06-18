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


import * as runtime from '../runtime';
import type {
  ModelsBulkAssignees,
  ModelsMessage,
  ModelsTaskAssginee,
  UserUser,
  WebHTTPError,
} from '../models/index';
import {
    ModelsBulkAssigneesFromJSON,
    ModelsBulkAssigneesToJSON,
    ModelsMessageFromJSON,
    ModelsMessageToJSON,
    ModelsTaskAssgineeFromJSON,
    ModelsTaskAssgineeToJSON,
    UserUserFromJSON,
    UserUserToJSON,
    WebHTTPErrorFromJSON,
    WebHTTPErrorToJSON,
} from '../models/index';

export interface TasksTaskIDAssigneesBulkPostRequest {
    taskID: number;
    assignee: ModelsBulkAssignees;
}

export interface TasksTaskIDAssigneesGetRequest {
    taskID: number;
    page?: number;
    perPage?: number;
    s?: string;
}

export interface TasksTaskIDAssigneesPutRequest {
    taskID: number;
    assignee: ModelsTaskAssginee;
}

export interface TasksTaskIDAssigneesUserIDDeleteRequest {
    taskID: number;
    userID: number;
}

/**
 * 
 */
export class AssigneesApi extends runtime.BaseAPI {

    /**
     * Adds multiple new assignees to a task. The assignee needs to have access to the project, the doer must be able to edit this task. Every user not in the project will be unassigned from the task, pass an empty array to unassign everyone.
     * Add multiple new assignees to a task
     */
    async tasksTaskIDAssigneesBulkPostRaw(requestParameters: TasksTaskIDAssigneesBulkPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<ModelsTaskAssginee>> {
        if (requestParameters['taskID'] == null) {
            throw new runtime.RequiredError(
                'taskID',
                'Required parameter "taskID" was null or undefined when calling tasksTaskIDAssigneesBulkPost().'
            );
        }

        if (requestParameters['assignee'] == null) {
            throw new runtime.RequiredError(
                'assignee',
                'Required parameter "assignee" was null or undefined when calling tasksTaskIDAssigneesBulkPost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (this.configuration && this.configuration.apiKey) {
            headerParameters["Authorization"] = await this.configuration.apiKey("Authorization"); // JWTKeyAuth authentication
        }

        const response = await this.request({
            path: `/tasks/{taskID}/assignees/bulk`.replace(`{${"taskID"}}`, encodeURIComponent(String(requestParameters['taskID']))),
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: ModelsBulkAssigneesToJSON(requestParameters['assignee']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ModelsTaskAssgineeFromJSON(jsonValue));
    }

    /**
     * Adds multiple new assignees to a task. The assignee needs to have access to the project, the doer must be able to edit this task. Every user not in the project will be unassigned from the task, pass an empty array to unassign everyone.
     * Add multiple new assignees to a task
     */
    async tasksTaskIDAssigneesBulkPost(requestParameters: TasksTaskIDAssigneesBulkPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ModelsTaskAssginee> {
        const response = await this.tasksTaskIDAssigneesBulkPostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Returns an array with all assignees for this task.
     * Get all assignees for a task
     */
    async tasksTaskIDAssigneesGetRaw(requestParameters: TasksTaskIDAssigneesGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Array<UserUser>>> {
        if (requestParameters['taskID'] == null) {
            throw new runtime.RequiredError(
                'taskID',
                'Required parameter "taskID" was null or undefined when calling tasksTaskIDAssigneesGet().'
            );
        }

        const queryParameters: any = {};

        if (requestParameters['page'] != null) {
            queryParameters['page'] = requestParameters['page'];
        }

        if (requestParameters['perPage'] != null) {
            queryParameters['per_page'] = requestParameters['perPage'];
        }

        if (requestParameters['s'] != null) {
            queryParameters['s'] = requestParameters['s'];
        }

        const headerParameters: runtime.HTTPHeaders = {};

        if (this.configuration && this.configuration.apiKey) {
            headerParameters["Authorization"] = await this.configuration.apiKey("Authorization"); // JWTKeyAuth authentication
        }

        const response = await this.request({
            path: `/tasks/{taskID}/assignees`.replace(`{${"taskID"}}`, encodeURIComponent(String(requestParameters['taskID']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => jsonValue.map(UserUserFromJSON));
    }

    /**
     * Returns an array with all assignees for this task.
     * Get all assignees for a task
     */
    async tasksTaskIDAssigneesGet(requestParameters: TasksTaskIDAssigneesGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Array<UserUser>> {
        const response = await this.tasksTaskIDAssigneesGetRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Adds a new assignee to a task. The assignee needs to have access to the project, the doer must be able to edit this task.
     * Add a new assignee to a task
     */
    async tasksTaskIDAssigneesPutRaw(requestParameters: TasksTaskIDAssigneesPutRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<ModelsTaskAssginee>> {
        if (requestParameters['taskID'] == null) {
            throw new runtime.RequiredError(
                'taskID',
                'Required parameter "taskID" was null or undefined when calling tasksTaskIDAssigneesPut().'
            );
        }

        if (requestParameters['assignee'] == null) {
            throw new runtime.RequiredError(
                'assignee',
                'Required parameter "assignee" was null or undefined when calling tasksTaskIDAssigneesPut().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (this.configuration && this.configuration.apiKey) {
            headerParameters["Authorization"] = await this.configuration.apiKey("Authorization"); // JWTKeyAuth authentication
        }

        const response = await this.request({
            path: `/tasks/{taskID}/assignees`.replace(`{${"taskID"}}`, encodeURIComponent(String(requestParameters['taskID']))),
            method: 'PUT',
            headers: headerParameters,
            query: queryParameters,
            body: ModelsTaskAssgineeToJSON(requestParameters['assignee']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ModelsTaskAssgineeFromJSON(jsonValue));
    }

    /**
     * Adds a new assignee to a task. The assignee needs to have access to the project, the doer must be able to edit this task.
     * Add a new assignee to a task
     */
    async tasksTaskIDAssigneesPut(requestParameters: TasksTaskIDAssigneesPutRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ModelsTaskAssginee> {
        const response = await this.tasksTaskIDAssigneesPutRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Un-assign a user from a task.
     * Delete an assignee
     */
    async tasksTaskIDAssigneesUserIDDeleteRaw(requestParameters: TasksTaskIDAssigneesUserIDDeleteRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<ModelsMessage>> {
        if (requestParameters['taskID'] == null) {
            throw new runtime.RequiredError(
                'taskID',
                'Required parameter "taskID" was null or undefined when calling tasksTaskIDAssigneesUserIDDelete().'
            );
        }

        if (requestParameters['userID'] == null) {
            throw new runtime.RequiredError(
                'userID',
                'Required parameter "userID" was null or undefined when calling tasksTaskIDAssigneesUserIDDelete().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        if (this.configuration && this.configuration.apiKey) {
            headerParameters["Authorization"] = await this.configuration.apiKey("Authorization"); // JWTKeyAuth authentication
        }

        const response = await this.request({
            path: `/tasks/{taskID}/assignees/{userID}`.replace(`{${"taskID"}}`, encodeURIComponent(String(requestParameters['taskID']))).replace(`{${"userID"}}`, encodeURIComponent(String(requestParameters['userID']))),
            method: 'DELETE',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ModelsMessageFromJSON(jsonValue));
    }

    /**
     * Un-assign a user from a task.
     * Delete an assignee
     */
    async tasksTaskIDAssigneesUserIDDelete(requestParameters: TasksTaskIDAssigneesUserIDDeleteRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ModelsMessage> {
        const response = await this.tasksTaskIDAssigneesUserIDDeleteRaw(requestParameters, initOverrides);
        return await response.value();
    }

}
