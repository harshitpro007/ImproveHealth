"use strict";

import * as Joi from "joi";

import { roleControllerV1 } from "@modules/role/index";
import * as appUtils from "@utils/appUtils";
import {
	MODULES,
	MODULES_ID,
	SERVER,
	SWAGGER_DEFAULT_RESPONSE_MESSAGES,
	REGEX,
	STATUS,
	VALIDATION_MESSAGE,
	PERMISSION,
	MESSAGES,
	REDIS_SUFFIX,
} from "@config/index";
import { authorizationHeaderObj } from "@utils/validator";
import { ResponseHandler } from "@utils/ResponseHandler";
import { roleAndPermission } from "@modules/permission/roleAndPermission";
let responseHandler = new ResponseHandler();

export let roleRoute = [
	{
		method: "POST",
		path: `${SERVER.API_BASE_URL}/v1/role`,
		handler: async (request, h) => {
			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			// const checkPermission = await roleAndPermission.checkPermission({module:MODULES.ROLE_MANAGEMENT,permission:PERMISSION.ADD},tokenData)
			// if(!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			let payload: RoleRequest.CreateRole = request.payload;
			try {
				let result = await roleControllerV1.createRole(payload, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "role"],
			description: "Create Role",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				payload: Joi.object({
					// role: Joi.string().trim().pattern(/^[A-Za-z\s]+$/).max(75).required(),
					role: Joi.string().trim().max(75).required(),
					permission: Joi.array().items(Joi.object({
						module: Joi.string().trim().valid(...Object.values(MODULES)).required(),
						moduleId: Joi.string().trim().valid(...Object.values(MODULES_ID)).required(),
						view: Joi.boolean().optional(),
						edit: Joi.boolean().optional(),
						add: Joi.boolean().optional(),
						delete: Joi.boolean().optional(),
					})).required().min(1).description('choose Permission atleast 1'),

				}),
				failAction: appUtils.failActionFunction
			},
			plugins: {
				"hapi-swagger": {
					responseMessages: SWAGGER_DEFAULT_RESPONSE_MESSAGES
				}
			}
		}
	},
	{
		method: "PUT",
		path: `${SERVER.API_BASE_URL}/v1/role`,
		handler: async (request, h) => {
			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			// const checkPermission = await roleAndPermission.checkPermission({module:MODULES.ROLE_MANAGEMENT,permission:PERMISSION.EDIT},tokenData)
			// if(!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			let payload: RoleRequest.EditRole = request.payload;
			try {
				let result = await roleControllerV1.editRole(payload, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "role"],
			description: "Edit Role",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				payload: Joi.object({
					roleId: Joi.string().trim().regex(REGEX.MONGO_ID).required(),
					role: Joi.string().trim().pattern(/^[A-Za-z\s]+$/).max(75).empty(false).optional(),
					permission: Joi.array().items(Joi.object({
						module: Joi.string().trim().valid(...Object.values(MODULES)).required(),
						moduleId: Joi.string().trim().valid(...Object.values(MODULES_ID)).required(),
						view: Joi.boolean().optional(),
						edit: Joi.boolean().optional(),
						add: Joi.boolean().optional(),
						delete: Joi.boolean().optional(),
					})).optional()
				}),
				failAction: appUtils.failActionFunction
			},
			plugins: {
				"hapi-swagger": {
					responseMessages: SWAGGER_DEFAULT_RESPONSE_MESSAGES
				}
			}
		}
	},
	{
		method: "PATCH",
		path: `${SERVER.API_BASE_URL}/v1/role/block-unblock`,
		handler: async (request, h) => {
			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			// const checkPermission = await roleAndPermission.checkPermission({module:MODULES.ROLE_MANAGEMENT,permission:PERMISSION.EDIT},tokenData)
			// if(!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			let payload: RoleRequest.BlockUnblockRole = request.payload;
			try {
				let result = await roleControllerV1.blockRole(payload, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "role"],
			description: "Block Unblock Role",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				payload: Joi.object({
					roleId: Joi.string().trim().regex(REGEX.MONGO_ID).required(),
					status: Joi.string().valid(
						STATUS.BLOCKED,
						STATUS.UN_BLOCKED
					).required().description("blocked-1, unblocked-2")
				}),
				failAction: appUtils.failActionFunction
			},
			plugins: {
				"hapi-swagger": {
					responseMessages: SWAGGER_DEFAULT_RESPONSE_MESSAGES
				}
			}
		}
	},
	// {
	// 	method: "DELETE",
	// 	path: `${SERVER.API_BASE_URL}/v1/role/{roleId}`,
	// 	handler: async (request, h) => {
	// 		const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
	// 		const checkPermission = await roleAndPermission.checkPermission({module:MODULES.ROLE_MANAGEMENT,permission:PERMISSION.EDIT},tokenData)
	// 		if(!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
	// 		let params: RoleRequest.RoleId = request.params;
	// 		try {
	// 			let result = await roleControllerV1.deleteRole(params, tokenData);
	// 			return responseHandler.sendSuccess(h, result);
	// 		} catch (error) {
	// 			return responseHandler.sendError(request, error);
	// 		}
	// 	},
	// 	config: {
	// 		tags: ["api", "role"],
	// 		description: "Delete Role",
	// 		auth: {
	// 			strategies: ["AdminAuth"]
	// 		},
	// 		validate: {
	// 			headers: authorizationHeaderObj,
	// 			params: Joi.object({
	// 				roleId: Joi.string().trim().regex(REGEX.MONGO_ID).required(),
	// 			}),
	// 			failAction: appUtils.failActionFunction
	// 		},
	// 		plugins: {
	// 			"hapi-swagger": {
	// 				responseMessages: SWAGGER_DEFAULT_RESPONSE_MESSAGES
	// 			}
	// 		}
	// 	}
	// },
	{
		method: "GET",
		path: `${SERVER.API_BASE_URL}/v1/role`,
		handler: async (request, h) => {
			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			// const checkPermission = await roleAndPermission.checkPermission({module:MODULES.ROLE_MANAGEMENT,permission:PERMISSION.VIEW},tokenData)
			// if(!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			let query: ListingRequest = request.query;
			try {
				let result = await roleControllerV1.roleList(query, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "role"],
			description: "Role List",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: Joi.object({
					pageNo: Joi.number().min(1).required(),
					limit: Joi.number().min(1).required(),
					searchKey: Joi.string().allow("").optional().description("Search by role"),
					// sortBy: Joi.string().trim().valid("created").optional().description("Sort by created"),
					// sortOrder: Joi.number().valid(1, -1).optional().description("1 for asc, -1 for desc"),
					// status: Joi.array().items(Joi.string().min(1)).single().optional().description('filter by status: BLOCKED, UN_BLOCKED'),
					// fromDate: Joi.number().optional().description("in timestamp"),
					// toDate: Joi.number().optional().description("in timestamp")
				}),
				failAction: appUtils.failActionFunction
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
		path: `${SERVER.API_BASE_URL}/v1/role/{roleId}`,
		handler: async (request, h) => {
			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			// const checkPermission = await roleAndPermission.checkPermission({module:MODULES.ROLE_MANAGEMENT,permission:PERMISSION.VIEW},tokenData)
			// if(!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			let params: RoleRequest.RoleId = request.params;
			try {
				let result = await roleControllerV1.roleDetails(params, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "role"],
			description: "Role Details",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				params: Joi.object({
					roleId: Joi.string().trim().regex(REGEX.MONGO_ID).required(),
				}),
				failAction: appUtils.failActionFunction
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
		path: `${SERVER.API_BASE_URL}/v1/subadmin`,
		handler: async (request, h) => {
			let payload: RoleRequest.CreateSubAdmin = request.payload;
			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			const checkPermission = await roleAndPermission.checkPermission({module:MODULES.USER_MANAGEMENT,permission:PERMISSION.EDIT},tokenData)
			if(!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			try {
				let result = await roleControllerV1.createSubAdmin(payload, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "subadmin"],
			description: "Create Sub Admin",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				payload: Joi.object({
					roleId: Joi.string().trim().regex(REGEX.MONGO_ID).required(),
					name: Joi.string().trim().optional(),
					email: Joi.string().email({ minDomainSegments: 2 }).regex(REGEX.EMAIL).lowercase().trim().required(),
				}),
				failAction: appUtils.failActionFunction
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
		path: `${SERVER.API_BASE_URL}/v1/role/list`,
		handler: async (request, h) => {
			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			// const checkPermission = await roleAndPermission.checkPermission({module:MODULES.ROLE_MANAGEMENT,permission:PERMISSION.VIEW},tokenData)
			// if(!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			try {
				let result = await roleControllerV1.getroleList(tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "role"],
			description: "Role List",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				failAction: appUtils.failActionFunction
			},
			plugins: {
				"hapi-swagger": {
					responseMessages: SWAGGER_DEFAULT_RESPONSE_MESSAGES
				}
			}
		}
	},
	{
		method: "PUT",
		path: `${SERVER.API_BASE_URL}/v1/subadmin`,
		handler: async (request, h) => {
			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			const checkPermission = await roleAndPermission.checkPermission({module:MODULES.USER_MANAGEMENT,permission:PERMISSION.EDIT},tokenData)
			if(!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			let payload: RoleRequest.EditSubAdmin = request.payload;
			try {
				let result = await roleControllerV1.editSubAdmin(payload, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "subadmin"],
			description: "Edit SubAdmin",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				payload: Joi.object({
					adminId: Joi.string().trim().regex(REGEX.MONGO_ID).required(),
					roleId: Joi.string().trim().regex(REGEX.MONGO_ID).optional(),
					// countryCode: Joi.string().optional().allow(""),
					// mobileNo: Joi.string()
					// .trim()
					// .regex(REGEX.MOBILE_NUMBER)
					// .optional()
					// .messages({ "string.pattern.base": VALIDATION_MESSAGE.mobileNo.pattern }).allow(""),
					// name: Joi.string().trim().optional(),
					// fullMobileNo: Joi.string().optional().allow("").description('Full Mobile Number')

				}),
				failAction: appUtils.failActionFunction

			},
			plugins: {
				"hapi-swagger": {
					responseMessages: SWAGGER_DEFAULT_RESPONSE_MESSAGES
				}
			}
		}
	},
	{
		method: "PATCH",
		path: `${SERVER.API_BASE_URL}/v1/subadmin/block-unblock`,
		handler: async (request, h) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				const checkPermission = await roleAndPermission.checkPermission({module:MODULES.USER_MANAGEMENT,permission:PERMISSION.EDIT},tokenData)
				if(!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
				const payload: RoleRequest.BlockSubAdmin = request.payload;
				let result = await roleControllerV1.blockUnblockSubAdmin(payload, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "subadmin"],
			description: "Block Unblock Sub Admin",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				payload: Joi.object({
					adminId: Joi.string().trim().regex(REGEX.MONGO_ID).required(),
					status: Joi.string().valid(
						STATUS.BLOCKED,
						STATUS.UN_BLOCKED,
					).required().description("BLOCKED-1, UN-BLOCKED-2")
				}),
				failAction: appUtils.failActionFunction
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
		path: `${SERVER.API_BASE_URL}/v1/subadmin/{adminId}`,
		handler: async (request, h) => {
			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			const checkPermission = await roleAndPermission.checkPermission({module:MODULES.USER_MANAGEMENT,permission:PERMISSION.EDIT},tokenData)
			if(!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			let params: RoleRequest.AdminId = request.params;
			try {
				let result = await roleControllerV1.deleteSubAdmin(params, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "subadmin"],
			description: "Delete SubAdmin",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				params: Joi.object({
					adminId: Joi.string().trim().regex(REGEX.MONGO_ID).required(),
				}),
				failAction: appUtils.failActionFunction
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
		path: `${SERVER.API_BASE_URL}/v1/subadmin`,
		handler: async (request, h) => {
			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			const checkPermission = await roleAndPermission.checkPermission({module:MODULES.USER_MANAGEMENT,permission:PERMISSION.VIEW},tokenData)
			if(!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			let query: RoleRequest.SubAdminList = request.query;
			try {
				let result = await roleControllerV1.subAdminList(query, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "subadmin"],
			description: "Sub Admin List",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: Joi.object({
					pageNo: Joi.number().min(1).required(),
					limit: Joi.number().min(1).required(),
					searchKey: Joi.string().allow("").optional().description("Search by name, email"),
					sortBy: Joi.string().trim().valid("created").optional().description("Sort by created"),
					sortOrder: Joi.number().valid(1, -1).optional().description("1 for asc, -1 for desc"),
					status: Joi.array().optional().items(Joi.string().min(1)).single().description("blocked-1, unblocked-2, pending-3"),
					fromDate: Joi.number().optional().description("in timestamp"),
					toDate: Joi.number().optional().description("in timestamp"),
					roleId: Joi.array().optional().items(Joi.string().min(1).regex(REGEX.MONGO_ID)).single(),
					isExport: Joi.boolean().default(false).description("Export data")
				}),
				failAction: appUtils.failActionFunction
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
		path: `${SERVER.API_BASE_URL}/v1/subadmin/{adminId}`,
		handler: async (request, h) => {
			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			const checkPermission = await roleAndPermission.checkPermission({module:MODULES.USER_MANAGEMENT,permission:PERMISSION.VIEW},tokenData)
			if(!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			let params: RoleRequest.AdminId = request.params;
			try {
				let result = await roleControllerV1.subAdminDetails(params, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "subadmin"],
			description: "Sub Admin Details",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				params: Joi.object({
					adminId: Joi.string().trim().regex(REGEX.MONGO_ID).required(),
				}),
				failAction: appUtils.failActionFunction
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
		path: `${SERVER.API_BASE_URL}/v1/resend-invite-subadmin`,
		handler: async (request, h) => {
			let payload: RoleRequest.resendInviteSubadmin = request.payload;
			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			const checkPermission = await roleAndPermission.checkPermission({module:MODULES.USER_MANAGEMENT,permission:PERMISSION.EDIT},tokenData)
			if(!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			try {
				let result = await roleControllerV1.resendInviteSubadmin(payload, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "subadmin"],
			description: "Resend SubAdmin invite",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				payload: Joi.object({
					adminId: Joi.string().trim().regex(REGEX.MONGO_ID).required(),
				}),
				failAction: appUtils.failActionFunction
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
		path: `${SERVER.API_BASE_URL}/v1/admin-subadmin-list`,
		handler: async (request, h) => {
			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			const checkPermission = await roleAndPermission.checkPermission({module:MODULES.USER_MANAGEMENT,permission:PERMISSION.VIEW},tokenData)
			if(!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			let query: RoleRequest.SubAdminList = request.query;
			try {
				let result = await roleControllerV1.adminSubAdminList(query, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "subadmin"],
			description: "all users List",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: Joi.object({
					pageNo: Joi.number().min(1).required(),
					limit: Joi.number().min(1).required(),
					searchKey: Joi.string().allow("").optional().description("Search by name, email"),
				}),
				failAction: appUtils.failActionFunction
			},
			plugins: {
				"hapi-swagger": {
					responseMessages: SWAGGER_DEFAULT_RESPONSE_MESSAGES
				}
			}
		}
	},
];