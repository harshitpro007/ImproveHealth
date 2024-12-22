"use strict";

import { Request, ResponseToolkit } from "@hapi/hapi";
import * as Joi from "joi";
import * as appUtils from "@utils/appUtils";
import { failActionFunction } from "@utils/appUtils";
import { eligibiltyCheckControllerV1 } from "@modules/eligibilityCheck/index";
import {
	SWAGGER_DEFAULT_RESPONSE_MESSAGES,
	SERVER,
	MODULES,
	PERMISSION,
	MESSAGES,
	REGEX,
	USER_TYPE,
} from "@config/index";
import { authorizationHeaderObj } from "@utils/validator";
import { responseHandler } from "@utils/ResponseHandler";
import { roleAndPermission } from "@modules/permission/roleAndPermission";


export const eligibiltyCheckRoute = [

	{
		method: "POST",
		path: `${SERVER.API_BASE_URL}/v1/eligibilty/single`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				// const checkPermission = await roleAndPermission.checkPermission({module:MODULES.GROUP_CATEGORY_MANAGEMENT,permission:PERMISSION.EDIT},tokenData)
				// if(!checkPermission) return MESSAGES.ERROR.INVALID_ADMIN;
				const payload: any = request.payload
				const result = await eligibiltyCheckControllerV1.addDataInModel(payload)
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "eligibilty"],
			description: "Add data in model",

			validate: {
				payload: Joi.object(),
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
		path: `${SERVER.API_BASE_URL}/v1/eligibilty/refresh`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				const checkPermission = await roleAndPermission.checkPermission({module:MODULES.CASE_MANAGEMENT,permission:PERMISSION.EDIT},tokenData)
				if(!checkPermission) return MESSAGES.ERROR.INVALID_ADMIN;
				// const payload:any = request.payload
				const result = await eligibiltyCheckControllerV1.saveNewFiles()
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "eligibilty"],
			description: "Add data in model",
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
	// all cases api
	// {
	// 	method: "GET",
	// 	path: `${SERVER.API_BASE_URL}/v1/cases/list`,
	// 	handler: async (request, h) => {
	// 		const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
	// 		const checkPermission = await roleAndPermission.checkPermission({ module: MODULES.CASE_MANAGEMENT, permission: PERMISSION.VIEW }, tokenData)
	// 		if (!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
	// 		let query: EligibiltyCheckRequest.List = request.query;
	// 		try {
	// 			let result = await eligibiltyCheckControllerV1.caseManagementList(query, tokenData);
	// 			return responseHandler.sendSuccess(h, result);
	// 		} catch (error) {
	// 			return responseHandler.sendError(request, error);
	// 		}
	// 	},
	// 	config: {
	// 		tags: ["api", "case"],
	// 		description: "all case management list",
	// 		auth: {
	// 			strategies: ["AdminAuth"]
	// 		},
	// 		validate: {
	// 			headers: authorizationHeaderObj,
	// 			query: Joi.object({
	// 				pageNo: Joi.number().min(1).required(),
	// 				limit: Joi.number().min(1).required(),
	// 				searchKey: Joi.string().allow("").optional().description("Search by DRN"),
	// 				sortBy: Joi.string().trim().valid("created").optional().description("Sort by created"),
	// 				sortOrder: Joi.number().valid(1, -1).optional().description("1 for asc, -1 for desc"),
	// 				status: Joi.array().optional().items(Joi.string().min(1)).single().description("eligible-1, in-progress-2, non-eligible-3, closed-4, outreach-5"),
	// 				complainantType: Joi.array().optional().items(Joi.string().min(1)).single().description("provider-1, health-plan-2, air-ambulance-3"),
	// 				disputeType: Joi.array().optional().items(Joi.string().min(1)).single().description("single-1, bundled-2, batch-3"),
	// 				fromDate: Joi.number().optional().description("in timestamp"),
	// 				toDate: Joi.number().optional().description("in timestamp"),
	// 				assignedfromDate: Joi.number().optional().description("in timestamp"),
	// 				assignedtoDate: Joi.number().optional().description("in timestamp"),
	// 				// adminId: Joi.array().optional().items(Joi.string().min(1).regex(REGEX.MONGO_ID)).single()
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
		path: `${SERVER.API_BASE_URL}/v1/cases/my-cases`,
		handler: async (request, h) => {
			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			const checkPermission = await roleAndPermission.checkPermission({ module: MODULES.CASE_MANAGEMENT, permission: PERMISSION.VIEW }, tokenData)
			if (!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			let query: EligibiltyCheckRequest.List = request.query;
			try {
				let result = await eligibiltyCheckControllerV1.caseManagementMyList(query, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "case"],
			description: "my assigned case management list",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: Joi.object({
					pageNo: Joi.number().min(1).required(),
					limit: Joi.number().min(1).required(),
					searchKey: Joi.string().allow("").optional().description("Search by DRN"),
					sortBy: Joi.string().trim().valid("created").optional().description("Sort by created"),
					sortOrder: Joi.number().valid(1, -1).optional().description("1 for asc, -1 for desc"),
					status: Joi.array().optional().items(Joi.string().min(1)).single().description("eligible-1, in-progress-2, non-eligible-3, closed-4, outreach-5"),
					complainantType: Joi.array().optional().items(Joi.string().min(1)).single().description("Provider-1, Health Plan-2, Air ambulance-3"),
					disputeType: Joi.array().optional().items(Joi.string().min(1)).single().description("single-1, bundled-2, batch-3"),
					fromDate: Joi.number().optional().description("in timestamp"),
					toDate: Joi.number().optional().description("in timestamp"),
					assignedfromDate: Joi.number().optional().description("in timestamp"),
					assignedtoDate: Joi.number().optional().description("in timestamp"),
					isExport: Joi.boolean().default(false),
					objection: Joi.array().optional().items(Joi.string().min(1)).single(),
					// adminId: Joi.array().optional().items(Joi.string().min(1).regex(REGEX.MONGO_ID)).single()
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
		path: `${SERVER.API_BASE_URL}/v1/cases/assigned`,
		handler: async (request, h) => {
			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			const checkPermission = await roleAndPermission.checkPermission({ module: MODULES.CASE_MANAGEMENT, permission: PERMISSION.VIEW }, tokenData)
			if (!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			let query: EligibiltyCheckRequest.List = request.query;
			try {
				let result = await eligibiltyCheckControllerV1.caseManagementAssignedList(query, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "case"],
			description: "assigned case management list",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: Joi.object({
					pageNo: Joi.number().min(1).required(),
					limit: Joi.number().min(1).required(),
					searchKey: Joi.string().allow("").optional().description("Search by DRN"),
					sortBy: Joi.string().trim().valid("created").optional().description("Sort by created"),
					sortOrder: Joi.number().valid(1, -1).optional().description("1 for asc, -1 for desc"),
					status: Joi.array().optional().items(Joi.string().min(1)).single().description("eligible-1, in-progress-2, non-eligible-3, closed-4, outreach-5"),
					complainantType: Joi.array().optional().items(Joi.string().min(1)).single().description("provider-1, health-plan-2, air-ambulance-3"),
					disputeType: Joi.array().optional().items(Joi.string().min(1)).single().description("single-1, bundled-2, batch-3"),
					fromDate: Joi.number().optional().description("in timestamp"),
					toDate: Joi.number().optional().description("in timestamp"),
					assignedfromDate: Joi.number().optional().description("in timestamp"),
					assignedtoDate: Joi.number().optional().description("in timestamp"),
					isExport: Joi.boolean().default(false),
					adminId: Joi.array().optional().items(Joi.string().min(1).regex(REGEX.MONGO_ID)).single(),
					objection: Joi.array().optional().items(Joi.string().min(1)).single(),
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
		path: `${SERVER.API_BASE_URL}/v1/cases/unassigned`,
		handler: async (request, h) => {
			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			const checkPermission = await roleAndPermission.checkPermission({ module: MODULES.CASE_MANAGEMENT, permission: PERMISSION.VIEW }, tokenData)
			if (!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			let query: EligibiltyCheckRequest.List = request.query;
			try {
				let result = await eligibiltyCheckControllerV1.caseManagementUnassignedList(query, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "case"],
			description: "my assigned case management list",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: Joi.object({
					pageNo: Joi.number().min(1).required(),
					limit: Joi.number().min(1).required(),
					searchKey: Joi.string().allow("").optional().description("Search by DRN"),
					sortBy: Joi.string().trim().valid("created").optional().description("Sort by created"),
					sortOrder: Joi.number().valid(1, -1).optional().description("1 for asc, -1 for desc"),
					status: Joi.array().optional().items(Joi.string().min(1)).single().description("eligible-1, in-progress-2, non-eligible-3, closed-4, outreach-5"),
					complainantType: Joi.array().optional().items(Joi.string().min(1)).single().description("provider-1, health-plan-2, air-ambulance-3"),
					disputeType: Joi.array().optional().items(Joi.string().min(1)).single().description("single-1, bundled-2, batch-3"),
					fromDate: Joi.number().optional().description("in timestamp"),
					toDate: Joi.number().optional().description("in timestamp"),
					assignedfromDate: Joi.number().optional().description("in timestamp"),
					assignedtoDate: Joi.number().optional().description("in timestamp"),
					isExport: Joi.boolean().default(false),
					objection: Joi.array().optional().items(Joi.string().min(1)).single(),
					// adminId: Joi.array().optional().items(Joi.string().min(1).regex(REGEX.MONGO_ID)).single()
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
		path: `${SERVER.API_BASE_URL}/v1/cases/{disputeId}/files`,
		handler: async (request, h) => {
			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			const checkPermission = await roleAndPermission.checkPermission({ module: MODULES.CASE_MANAGEMENT, permission: PERMISSION.VIEW }, tokenData)
			if (!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			let query: EligibiltyCheckRequest.Details = request.query;
			try {
				let result = await eligibiltyCheckControllerV1.myDisputeFiles(query, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "case"],
			description: "Dispute files list",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: Joi.object({
					disputeId: Joi.string().regex(REGEX.MONGO_ID).required().description("dispute ID")
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
		path: `${SERVER.API_BASE_URL}/v1/cases/{disputeId}/details`,
		handler: async (request, h) => {
			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			const checkPermission = await roleAndPermission.checkPermission({ module: MODULES.CASE_MANAGEMENT, permission: PERMISSION.VIEW }, tokenData)
			if (!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			let query: EligibiltyCheckRequest.Details = request.query;
			try {
				let result = await eligibiltyCheckControllerV1.disputeDetails(query, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "case"],
			description: "assigned case management list",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: Joi.object({
					disputeId: Joi.string().regex(REGEX.MONGO_ID).required().description("dispute ID")
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
	// 	method: "POST",
	// 	path: `${SERVER.API_BASE_URL}/v1/calculate-business-days`,
	// 	handler: async (request: Request | any, h: ResponseToolkit) => {
	// 		try {
	// 			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
	// 			// const checkPermission = await roleAndPermission.checkPermission({module:MODULES.GROUP_CATEGORY_MANAGEMENT,permission:PERMISSION.EDIT},tokenData)
	// 			// if(!checkPermission) return MESSAGES.ERROR.INVALID_ADMIN;
	// 			const payload: any = request.payload
	// 			const result = await eligibiltyCheckControllerV1.calculateBusinessDays(payload.startDate,payload.endDate)
	// 			return responseHandler.sendSuccess(h, result);
	// 		} catch (error) {
	// 			return responseHandler.sendError(request, error);
	// 		}
	// 	},
	// 	config: {
	// 		tags: ["api", "eligibilty"],
	// 		description: "Add data in model",

	// 		validate: {
	// 			payload: Joi.object({
	// 				startDate:Joi.number().required(),
	// 				endDate:Joi.number().required()
	// 			}),
	// 			failAction: failActionFunction
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
		path: `${SERVER.API_BASE_URL}/v1/cases/{disputeId}/eligibility`,
		handler: async (request, h) => {
			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			const checkPermission = await roleAndPermission.checkPermission({ module: MODULES.CASE_MANAGEMENT, permission: PERMISSION.VIEW }, tokenData)
			if (!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			let query: EligibiltyCheckRequest.Details = request.query;
			try {
				let result = await eligibiltyCheckControllerV1.eligibilityCheckList(query, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "case"],
			description: "Eligibility Check list",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: Joi.object({
					disputeId: Joi.string().regex(REGEX.MONGO_ID).required().description("Dispute ID")
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
		path: `${SERVER.API_BASE_URL}/v1/cases/{disputeId}/eligibility-outreach`,
		handler: async (request, h) => {
			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			const checkPermission = await roleAndPermission.checkPermission({ module: MODULES.CASE_MANAGEMENT, permission: PERMISSION.VIEW }, tokenData)
			if (!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			let query: EligibiltyCheckRequest.Details = request.query;
			try {
				let result = await eligibiltyCheckControllerV1.eligibilityOutreachCheckList(query, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "case"],
			description: "Eligibility Outreach Check list",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: Joi.object({
					disputeId: Joi.string().regex(REGEX.MONGO_ID).required().description("Dispute ID")
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
		path: `${SERVER.API_BASE_URL}/v1/cases/{disputeId}/eligibility-objection`,
		handler: async (request, h) => {
			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			const checkPermission = await roleAndPermission.checkPermission({ module: MODULES.CASE_MANAGEMENT, permission: PERMISSION.VIEW }, tokenData)
			if (!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			let query: EligibiltyCheckRequest.Details = request.query;
			try {
				let result = await eligibiltyCheckControllerV1.eligibilityObjectionCheckList(query, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "case"],
			description: "Eligibility Objection Check list",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: Joi.object({
					disputeId: Joi.string().regex(REGEX.MONGO_ID).required().description("Dispute ID")
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
		path: `${SERVER.API_BASE_URL}/v1/cases/{disputeId}/rescan`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				const checkPermission = await roleAndPermission.checkPermission({module:MODULES.CASE_MANAGEMENT,permission:PERMISSION.EDIT},tokenData)
				if(!checkPermission) return MESSAGES.ERROR.INVALID_ADMIN;
				const payload: any = request.payload
				const result = await eligibiltyCheckControllerV1.rescan(payload,tokenData)
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "case"],
			description: "Rescan the dispute",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				payload: Joi.object({
					disputeId:Joi.string().regex(REGEX.MONGO_ID).required().description("Dispute ID")
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
		path: `${SERVER.API_BASE_URL}/v1/fetch/files`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				// const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				// const checkPermission = await roleAndPermission.checkPermission({module:MODULES.GROUP_CATEGORY_MANAGEMENT,permission:PERMISSION.EDIT},tokenData)
				// if(!checkPermission) return MESSAGES.ERROR.INVALID_ADMIN;
				const payload: any = request.payload
				const result = await eligibiltyCheckControllerV1.fetchFiles(payload.folderName)
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "eligibilty"],
			description: "Add data in model",
			validate: {
				payload: Joi.object({
					folderName:Joi.string().trim()
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
		path: `${SERVER.API_BASE_URL}/v1/cases/{disputeId}/activity-log`,
		handler: async (request, h) => {
			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			const checkPermission = await roleAndPermission.checkPermission({ module: MODULES.CASE_MANAGEMENT, permission: PERMISSION.VIEW }, tokenData)
			if (!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			let query: EligibiltyCheckRequest.Details = request.query;
			try {
				let result = await eligibiltyCheckControllerV1.activityLog(query, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "case"],
			description: "Activity Log",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: Joi.object({
					disputeId: Joi.string().regex(REGEX.MONGO_ID).required().description("dispute ID"),
					pageNo: Joi.number().min(1).required(),
					limit: Joi.number().min(1).required(),
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
	// 	method: "POST",
	// 	path: `${SERVER.API_BASE_URL}/v1/cases/cooling-off-check`,
	// 	handler: async (request: Request | any, h: ResponseToolkit) => {
	// 		try {
	// 			const payload: any = request.payload
	// 			const result = await eligibiltyCheckControllerV1.coolingOff(payload)
	// 			return responseHandler.sendSuccess(h, result);
	// 		} catch (error) {
	// 			return responseHandler.sendError(request, error);
	// 		}
	// 	},
	// 	config: {
	// 		tags: ["api", "eligibilty"],
	// 		description: "cooling off check",
	// 		validate: {
	// 			payload: Joi.object(),
	// 		},
	// 		plugins: {
	// 			"hapi-swagger": {
	// 				responseMessages: SWAGGER_DEFAULT_RESPONSE_MESSAGES
	// 			}
	// 		}
	// 	}
	// },
	{
		method: "POST",
		path: `${SERVER.API_BASE_URL}/v1/cases/assign`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				// const checkPermission = await roleAndPermission.checkPermission({module:MODULES.GROUP_CATEGORY_MANAGEMENT,permission:PERMISSION.EDIT},tokenData)
				// if(!checkPermission) return MESSAGES.ERROR.INVALID_ADMIN;
				if(tokenData.userType !== USER_TYPE.ADMIN) return MESSAGES.ERROR.INVALID_ADMIN;
				const payload: EligibiltyCheckRequest.Assign = request.payload
				const result = await eligibiltyCheckControllerV1.assignNewUser(payload,tokenData)
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "case"],
			description: "New assign user",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				payload: Joi.object({
					disputeId: Joi.array().optional().items(Joi.string().min(1).regex(REGEX.MONGO_ID)).single(),
					adminId: Joi.string().min(1).regex(REGEX.MONGO_ID)
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
		path: `${SERVER.API_BASE_URL}/v1/cases/un-assign`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				// const checkPermission = await roleAndPermission.checkPermission({module:MODULES.GROUP_CATEGORY_MANAGEMENT,permission:PERMISSION.EDIT},tokenData)
				// if(!checkPermission) return MESSAGES.ERROR.INVALID_ADMIN;
				if(tokenData.userType !== USER_TYPE.ADMIN) return MESSAGES.ERROR.INVALID_ADMIN;
				const payload: EligibiltyCheckRequest.UnAssign = request.payload
				const result = await eligibiltyCheckControllerV1.unAssignUser(payload,tokenData)
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "case"],
			description: "Un assign user",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				payload: Joi.object({
					disputeId: Joi.array().optional().items(Joi.string().min(1).regex(REGEX.MONGO_ID)).single(),
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
		path: `${SERVER.API_BASE_URL}/v1/cases/re-assign`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				// const checkPermission = await roleAndPermission.checkPermission({module:MODULES.GROUP_CATEGORY_MANAGEMENT,permission:PERMISSION.EDIT},tokenData)
				// if(!checkPermission) return MESSAGES.ERROR.INVALID_ADMIN;
				const payload: EligibiltyCheckRequest.Assign = request.payload
				const result = await eligibiltyCheckControllerV1.reAssignUser(payload,tokenData)
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "case"],
			description: "Re assign user",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				payload: Joi.object({
					disputeId: Joi.array().optional().items(Joi.string().min(1).regex(REGEX.MONGO_ID)).single(),
					adminId: Joi.string().min(1).regex(REGEX.MONGO_ID)
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
		path: `${SERVER.API_BASE_URL}/v1/duplicateRecords`,
		handler: async (request, h) => {
			// const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
			// const checkPermission = await roleAndPermission.checkPermission({ module: MODULES.CASE_MANAGEMENT, permission: PERMISSION.VIEW }, tokenData)
			// if (!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			// let query: EligibiltyCheckRequest.Details = request.query;
			try {
				let result = await eligibiltyCheckControllerV1.deleteDuplicateRecords();
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "duplicate"],
			description: "Duplicate Records",
			// auth: {
			// 	strategies: ["AdminAuth"]
			// },
			validate: {
				// headers: authorizationHeaderObj,
				// query: Joi.object({
				// 	disputeId: Joi.string().regex(REGEX.MONGO_ID).required().description("dispute ID"),
				// 	pageNo: Joi.number().min(1).required(),
				// 	limit: Joi.number().min(1).required(),
				// }),
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
		path: `${SERVER.API_BASE_URL}/v1/eligibilty/cron-refresh`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				// const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				// const checkPermission = await roleAndPermission.checkPermission({module:MODULES.CASE_MANAGEMENT,permission:PERMISSION.EDIT},tokenData)
				// if(!checkPermission) return MESSAGES.ERROR.INVALID_ADMIN;
				// const payload:any = request.payload
				const result = await eligibiltyCheckControllerV1.saveNewFiles()
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "eligibilty"],
			description: "Cron refresh Sync",
			
			validate: {
				// headers: authorizationHeaderObj,
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
		path: `${SERVER.API_BASE_URL}/v1/cases/check-extension`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				// const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				// const checkPermission = await roleAndPermission.checkPermission({module:MODULES.GROUP_CATEGORY_MANAGEMENT,permission:PERMISSION.EDIT},tokenData)
				// if(!checkPermission) return MESSAGES.ERROR.INVALID_ADMIN;
				const payload: EligibiltyCheckRequest.Assign = request.payload
				const result = await eligibiltyCheckControllerV1.calculateExtension(payload)
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "case"],
			description: "Re assign user",
			validate: {
				payload: Joi.object({
					ipName: Joi.string().trim(),
					nipName: Joi.string().trim(),
					state: Joi.array().items().optional(),
					startDate: Joi.number(),
					endDate: Joi.number()
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
		path: `${SERVER.API_BASE_URL}/v1/cases/check-file`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				// const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				// const checkPermission = await roleAndPermission.checkPermission({module:MODULES.GROUP_CATEGORY_MANAGEMENT,permission:PERMISSION.EDIT},tokenData)
				// if(!checkPermission) return MESSAGES.ERROR.INVALID_ADMIN;
				const payload: any = request.payload
				const result = await eligibiltyCheckControllerV1.downloadFile(payload.url)
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "case"],
			description: "Re assign user",
			validate: {
				payload: Joi.object({
					url: Joi.string().trim(),
					// nipName: Joi.string().trim(),
					// state: Joi.array().items().optional(),
					// startDate: Joi.number(),
					// endDate: Joi.number()
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