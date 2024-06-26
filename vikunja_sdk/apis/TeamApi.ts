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


import * as runtime from '../runtime';
import type {
  ModelsMessage,
  ModelsTeam,
  ModelsTeamMember,
  WebHTTPError,
} from '../models/index';
import {
    ModelsMessageFromJSON,
    ModelsMessageToJSON,
    ModelsTeamFromJSON,
    ModelsTeamToJSON,
    ModelsTeamMemberFromJSON,
    ModelsTeamMemberToJSON,
    WebHTTPErrorFromJSON,
    WebHTTPErrorToJSON,
} from '../models/index';

export interface TeamsGetRequest {
    page?: number;
    perPage?: number;
    s?: string;
}

export interface TeamsIdDeleteRequest {
    id: number;
}

export interface TeamsIdGetRequest {
    id: number;
}

export interface TeamsIdMembersPutRequest {
    id: number;
    team: ModelsTeamMember;
}

export interface TeamsIdMembersUserIDAdminPostRequest {
    id: number;
    userID: number;
}

export interface TeamsIdMembersUserIDDeleteRequest {
    id: number;
    userID: number;
}

export interface TeamsIdPostRequest {
    id: number;
    team: ModelsTeam;
}

export interface TeamsPutRequest {
    team: ModelsTeam;
}

/**
 * 
 */
export class TeamApi extends runtime.BaseAPI {

    /**
     * Returns all teams the current user is part of.
     * Get teams
     */
    async teamsGetRaw(requestParameters: TeamsGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Array<ModelsTeam>>> {
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
            path: `/teams`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => jsonValue.map(ModelsTeamFromJSON));
    }

    /**
     * Returns all teams the current user is part of.
     * Get teams
     */
    async teamsGet(requestParameters: TeamsGetRequest = {}, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Array<ModelsTeam>> {
        const response = await this.teamsGetRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Delets a team. This will also remove the access for all users in that team.
     * Deletes a team
     */
    async teamsIdDeleteRaw(requestParameters: TeamsIdDeleteRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<ModelsMessage>> {
        if (requestParameters['id'] == null) {
            throw new runtime.RequiredError(
                'id',
                'Required parameter "id" was null or undefined when calling teamsIdDelete().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        if (this.configuration && this.configuration.apiKey) {
            headerParameters["Authorization"] = await this.configuration.apiKey("Authorization"); // JWTKeyAuth authentication
        }

        const response = await this.request({
            path: `/teams/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters['id']))),
            method: 'DELETE',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ModelsMessageFromJSON(jsonValue));
    }

    /**
     * Delets a team. This will also remove the access for all users in that team.
     * Deletes a team
     */
    async teamsIdDelete(requestParameters: TeamsIdDeleteRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ModelsMessage> {
        const response = await this.teamsIdDeleteRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Returns a team by its ID.
     * Gets one team
     */
    async teamsIdGetRaw(requestParameters: TeamsIdGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<ModelsTeam>> {
        if (requestParameters['id'] == null) {
            throw new runtime.RequiredError(
                'id',
                'Required parameter "id" was null or undefined when calling teamsIdGet().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        if (this.configuration && this.configuration.apiKey) {
            headerParameters["Authorization"] = await this.configuration.apiKey("Authorization"); // JWTKeyAuth authentication
        }

        const response = await this.request({
            path: `/teams/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters['id']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ModelsTeamFromJSON(jsonValue));
    }

    /**
     * Returns a team by its ID.
     * Gets one team
     */
    async teamsIdGet(requestParameters: TeamsIdGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ModelsTeam> {
        const response = await this.teamsIdGetRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Add a user to a team.
     * Add a user to a team
     */
    async teamsIdMembersPutRaw(requestParameters: TeamsIdMembersPutRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<ModelsTeamMember>> {
        if (requestParameters['id'] == null) {
            throw new runtime.RequiredError(
                'id',
                'Required parameter "id" was null or undefined when calling teamsIdMembersPut().'
            );
        }

        if (requestParameters['team'] == null) {
            throw new runtime.RequiredError(
                'team',
                'Required parameter "team" was null or undefined when calling teamsIdMembersPut().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (this.configuration && this.configuration.apiKey) {
            headerParameters["Authorization"] = await this.configuration.apiKey("Authorization"); // JWTKeyAuth authentication
        }

        const response = await this.request({
            path: `/teams/{id}/members`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters['id']))),
            method: 'PUT',
            headers: headerParameters,
            query: queryParameters,
            body: ModelsTeamMemberToJSON(requestParameters['team']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ModelsTeamMemberFromJSON(jsonValue));
    }

    /**
     * Add a user to a team.
     * Add a user to a team
     */
    async teamsIdMembersPut(requestParameters: TeamsIdMembersPutRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ModelsTeamMember> {
        const response = await this.teamsIdMembersPutRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * If a user is team admin, this will make them member and vise-versa.
     * Toggle a team member\'s admin status
     */
    async teamsIdMembersUserIDAdminPostRaw(requestParameters: TeamsIdMembersUserIDAdminPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<ModelsMessage>> {
        if (requestParameters['id'] == null) {
            throw new runtime.RequiredError(
                'id',
                'Required parameter "id" was null or undefined when calling teamsIdMembersUserIDAdminPost().'
            );
        }

        if (requestParameters['userID'] == null) {
            throw new runtime.RequiredError(
                'userID',
                'Required parameter "userID" was null or undefined when calling teamsIdMembersUserIDAdminPost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        if (this.configuration && this.configuration.apiKey) {
            headerParameters["Authorization"] = await this.configuration.apiKey("Authorization"); // JWTKeyAuth authentication
        }

        const response = await this.request({
            path: `/teams/{id}/members/{userID}/admin`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters['id']))).replace(`{${"userID"}}`, encodeURIComponent(String(requestParameters['userID']))),
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ModelsMessageFromJSON(jsonValue));
    }

    /**
     * If a user is team admin, this will make them member and vise-versa.
     * Toggle a team member\'s admin status
     */
    async teamsIdMembersUserIDAdminPost(requestParameters: TeamsIdMembersUserIDAdminPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ModelsMessage> {
        const response = await this.teamsIdMembersUserIDAdminPostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Remove a user from a team. This will also revoke any access this user might have via that team. A user can remove themselves from the team if they are not the last user in the team.
     * Remove a user from a team
     */
    async teamsIdMembersUserIDDeleteRaw(requestParameters: TeamsIdMembersUserIDDeleteRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<ModelsMessage>> {
        if (requestParameters['id'] == null) {
            throw new runtime.RequiredError(
                'id',
                'Required parameter "id" was null or undefined when calling teamsIdMembersUserIDDelete().'
            );
        }

        if (requestParameters['userID'] == null) {
            throw new runtime.RequiredError(
                'userID',
                'Required parameter "userID" was null or undefined when calling teamsIdMembersUserIDDelete().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        if (this.configuration && this.configuration.apiKey) {
            headerParameters["Authorization"] = await this.configuration.apiKey("Authorization"); // JWTKeyAuth authentication
        }

        const response = await this.request({
            path: `/teams/{id}/members/{userID}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters['id']))).replace(`{${"userID"}}`, encodeURIComponent(String(requestParameters['userID']))),
            method: 'DELETE',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ModelsMessageFromJSON(jsonValue));
    }

    /**
     * Remove a user from a team. This will also revoke any access this user might have via that team. A user can remove themselves from the team if they are not the last user in the team.
     * Remove a user from a team
     */
    async teamsIdMembersUserIDDelete(requestParameters: TeamsIdMembersUserIDDeleteRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ModelsMessage> {
        const response = await this.teamsIdMembersUserIDDeleteRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Updates a team.
     * Updates a team
     */
    async teamsIdPostRaw(requestParameters: TeamsIdPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<ModelsTeam>> {
        if (requestParameters['id'] == null) {
            throw new runtime.RequiredError(
                'id',
                'Required parameter "id" was null or undefined when calling teamsIdPost().'
            );
        }

        if (requestParameters['team'] == null) {
            throw new runtime.RequiredError(
                'team',
                'Required parameter "team" was null or undefined when calling teamsIdPost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (this.configuration && this.configuration.apiKey) {
            headerParameters["Authorization"] = await this.configuration.apiKey("Authorization"); // JWTKeyAuth authentication
        }

        const response = await this.request({
            path: `/teams/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters['id']))),
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: ModelsTeamToJSON(requestParameters['team']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ModelsTeamFromJSON(jsonValue));
    }

    /**
     * Updates a team.
     * Updates a team
     */
    async teamsIdPost(requestParameters: TeamsIdPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ModelsTeam> {
        const response = await this.teamsIdPostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Creates a new team.
     * Creates a new team
     */
    async teamsPutRaw(requestParameters: TeamsPutRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<ModelsTeam>> {
        if (requestParameters['team'] == null) {
            throw new runtime.RequiredError(
                'team',
                'Required parameter "team" was null or undefined when calling teamsPut().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (this.configuration && this.configuration.apiKey) {
            headerParameters["Authorization"] = await this.configuration.apiKey("Authorization"); // JWTKeyAuth authentication
        }

        const response = await this.request({
            path: `/teams`,
            method: 'PUT',
            headers: headerParameters,
            query: queryParameters,
            body: ModelsTeamToJSON(requestParameters['team']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ModelsTeamFromJSON(jsonValue));
    }

    /**
     * Creates a new team.
     * Creates a new team
     */
    async teamsPut(requestParameters: TeamsPutRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ModelsTeam> {
        const response = await this.teamsPutRaw(requestParameters, initOverrides);
        return await response.value();
    }

}
