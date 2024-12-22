"use strict";

import { Request, ResponseToolkit } from "@hapi/hapi";
import * as Joi from "joi";

import { failActionFunction } from "@utils/appUtils";
import {
	SWAGGER_DEFAULT_RESPONSE_MESSAGES,
	SERVER,
	PARTY_TYPE,
	REGEX,
	MODULES,
	PERMISSION,
	MESSAGES,
} from "@config/index";
import { responseHandler } from "@utils/ResponseHandler";
import { authorizationHeaderObj } from "@utils/validator";
import { extensionControllerV1 } from "@modules/extension/index";
import { roleAndPermission } from "@modules/permission/roleAndPermission";

export const extensionRoute = [

	{
		method: "GET",
		path: `${SERVER.API_BASE_URL}/v1/extension`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				const checkPermission = await roleAndPermission.checkPermission({module:MODULES.EXTENSION_MANAGEMENT,permission:PERMISSION.VIEW},tokenData)
				if(!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
				const query: ListingRequest = request.query;

				const result = await extensionControllerV1.getList(query);

				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "Extension"],
			description: "List Extension",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: Joi.object({
					pageNo: Joi.number().min(1).required(),
					limit: Joi.number().min(1).required(),
					sortBy: Joi.string().trim().valid("created").optional().description("Sort by created"),
					fromDate: Joi.number().optional().description("in timestamp"),
					toDate: Joi.number().optional().description("in timestamp"),	
				}),
				failAction: failActionFunction
			},
			plugins: {
				"hapi-swagger": {
					responseMessages: SWAGGER_DEFAULT_RESPONSE_MESSAGES
				}
			}
		}
	},
	{
		method: "POST",
		path: `${SERVER.API_BASE_URL}/v1/extension`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				const checkPermission = await roleAndPermission.checkPermission({module:MODULES.EXTENSION_MANAGEMENT,permission:PERMISSION.ADD},tokenData)
				if(!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
				const payload: ExtensionRequest.Add = request.payload;

				const result = await extensionControllerV1.add(payload);

				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "Extension"],
			description: "Add new Extension",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				payload: Joi.object({
					ipName: Joi.array().items().optional().description('Ip listing'),
					nipName: Joi.array().items().optional().description('Nip listing'),
					startDate: Joi.number().required().description('In timestamp'),
					endDate: Joi.number().required().description('In timestamp'),
					ipType: Joi.string().trim().valid(PARTY_TYPE.ALL,PARTY_TYPE.NOT_ALL),
					nipType: Joi.string().trim().valid(PARTY_TYPE.ALL,PARTY_TYPE.NOT_ALL),
					reason: Joi.string().optional(),
					stateName: Joi.array().items().optional().description('State listing'),
				}),
				failAction: failActionFunction
			},
			plugins: {
				"hapi-swagger": {
					responseMessages: SWAGGER_DEFAULT_RESPONSE_MESSAGES
				}
			}
		}
	},
	{
		method: "DELETE",
		path: `${SERVER.API_BASE_URL}/v1/extension`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				const checkPermission = await roleAndPermission.checkPermission({module:MODULES.EXTENSION_MANAGEMENT,permission:PERMISSION.DELTETE},tokenData)
				if(!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
				const query: ExtensionRequest.ID = request.query;

				const result = await extensionControllerV1.delete(query);

				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "Extension"],
			description: "Delete Extension",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: Joi.object({
					extensionId: Joi.string().regex(REGEX.MONGO_ID).required()		
				}),
				failAction: failActionFunction
			},
			plugins: {
				"hapi-swagger": {
					responseMessages: SWAGGER_DEFAULT_RESPONSE_MESSAGES
				}
			}
		}
	},
	{
		method: "GET",
		path: `${SERVER.API_BASE_URL}/v1/ip`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				const query: ListingRequest = request.query;

				const result = await extensionControllerV1.ipList(query,tokenData);

				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "Extension"],
			description: "IP List",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: Joi.object({
					pageNo: Joi.number().min(1).required(),
					limit: Joi.number().min(1).required(),
					searchKey: Joi.string().allow("").optional().description("Search by name"),
				}),
				failAction: failActionFunction
			},
			plugins: {
				"hapi-swagger": {
					responseMessages: SWAGGER_DEFAULT_RESPONSE_MESSAGES
				}
			}
		}
	},
	{
		method: "GET",
		path: `${SERVER.API_BASE_URL}/v1/nip`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				const query: ListingRequest = request.query;
				const result = await extensionControllerV1.nipList(query);

				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "Extension"],
			description: "NIP List",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: Joi.object({
					pageNo: Joi.number().min(1).required(),
					limit: Joi.number().min(1).required(),
					searchKey: Joi.string().allow("").optional().description("Search by name"),
				}),
				failAction: failActionFunction
			},
			plugins: {
				"hapi-swagger": {
					responseMessages: SWAGGER_DEFAULT_RESPONSE_MESSAGES
				}
			}
		}
	},
	{
		method: "GET",
		path: `${SERVER.API_BASE_URL}/v1/states`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				const result = await extensionControllerV1.stateList(tokenData);

				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "Extension"],
			description: "State List",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				failAction: failActionFunction
			},
			plugins: {
				"hapi-swagger": {
					responseMessages: SWAGGER_DEFAULT_RESPONSE_MESSAGES
				}
			}
		}
	},
];