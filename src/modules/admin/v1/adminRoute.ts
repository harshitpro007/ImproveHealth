"use strict";

import { Request, ResponseToolkit } from "@hapi/hapi";
import * as Joi from "joi";

import { adminControllerV1, adminDaoV1 } from "@modules/admin/index";

import { failActionFunction } from "@utils/appUtils";
import { authorizationHeaderObj, headerObject } from "@utils/validator";
import {
	REGEX,
	SWAGGER_DEFAULT_RESPONSE_MESSAGES,
	STATUS,
	VALIDATION_CRITERIA,
	VALIDATION_MESSAGE,
	SERVER,
	DEVICE_TYPE,
	MODULES,
	MESSAGES,
	PERMISSION,
	REDIS_SUFFIX,
	REDIS_PREFIX,
} from "@config/index";
import { responseHandler } from "@utils/ResponseHandler";
import { roleAndPermission } from "@modules/permission/roleAndPermission";
import { redisClient } from "@lib/index";
export const adminRoute = [
	{
		method: "POST",
		path: `${SERVER.API_BASE_URL}/v1/admin/login`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const headers = request.headers;
				const payload: AdminRequest.Login = request.payload;
				payload.remoteAddress = request["headers"]["x-forwarded-for"] || request.info.remoteAddress;
				const result = await adminControllerV1.login({ ...headers, ...payload });
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "admin"],
			description: "Admin Login",
			auth: {
				strategies: ["BasicAuth"]
			},
			validate: {
				headers: headerObject["required"],
				payload: Joi.object({
					email: Joi.string()
						.trim()
						.lowercase()
						// .email({ minDomainSegments: 2 })
						.regex(REGEX.EMAIL)
						.required(),
					password: Joi.string()
						.trim()
						.regex(REGEX.PASSWORD)
						.min(VALIDATION_CRITERIA.PASSWORD_MIN_LENGTH)
						.max(VALIDATION_CRITERIA.PASSWORD_MAX_LENGTH)
						.default(SERVER.DEFAULT_PASSWORD)
						.required()
						.messages({
							"string.pattern.base": VALIDATION_MESSAGE.password.pattern,
							"string.min": VALIDATION_MESSAGE.password.minlength,
							"string.max": VALIDATION_MESSAGE.password.maxlength,
							"string.empty": VALIDATION_MESSAGE.password.required,
							"any.required": VALIDATION_MESSAGE.password.required
						}),
					deviceId: Joi.string().trim().required(),
					platform: Joi.string().required().valid(DEVICE_TYPE.WEB),
					deviceToken: Joi.string().optional()
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
		path: `${SERVER.API_BASE_URL}/v1/admin/refreshToken`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const headers = request.headers;
				const payload: AdminRequest.RefreshToken = request.payload;
				payload.remoteAddress = request["headers"]["x-forwarded-for"] || request.info.remoteAddress;
				const result = await adminControllerV1.refreshToken({ ...headers, ...payload } );
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		options: {
			tags: ["api", "admin"],
			description: "Create a new token using refresh token",
			auth: {
				strategies: ["BasicAuth"]
			},
			validate: {
				headers: headerObject["required"],
				payload: Joi.object({
					refreshToken: Joi.string().trim().required(),
					deviceId: Joi.string().trim().required(),
					deviceToken: Joi.string().trim().optional(),
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
		path: `${SERVER.API_BASE_URL}/v1/admin/logout`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				const result = await adminControllerV1.logout(tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "admin"],
			description: "Logout",
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
	{
		method: "POST",
		path: `${SERVER.API_BASE_URL}/v1/admin/forgot-password`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const payload: AdminRequest.ForgotPasswordRequest = request.payload;
				const result = await adminControllerV1.forgotPassword(payload);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "admin"],
			description: "Forgot Password",
			auth: {
				strategies: ["BasicAuth"]
			},
			validate: {
				headers: headerObject["required"],
				payload: Joi.object({
					email: Joi.string()
						.trim()
						.lowercase()
						// .email({ minDomainSegments: 2 })
						.regex(REGEX.EMAIL)
						.required()
						.messages({
							"string.pattern.base": VALIDATION_MESSAGE.email.pattern
						})
				}),
				failAction: failActionFunction
			},
			plugins: {
				"hapi-swagger": {
					responseMessages: SWAGGER_DEFAULT_RESPONSE_MESSAGES
				},
				"hapi-rate-limit": {
                    userLimit: 5, // Customize rate limit as per your requirement
                    duration: 60000, // 1 minute duration
                }
			}
		}
	},
	{
		method: "POST",
		path: `${SERVER.API_BASE_URL}/v1/admin/verify-otp`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const payload: UserRequest.VerifyOTP = request.payload;
				const result = await adminControllerV1.verifyOTP(payload);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "admin"],
			description: "Verify OTP on Email",
			auth: {
				strategies: ["BasicAuth"]
			},
			validate: {
				headers: headerObject["required"],
				payload: Joi.object({
					// countryCode: Joi.string().required(),
					otp: Joi.string().default(SERVER.DEFAULT_OTP).required(),
					email: Joi.string()
						.trim()
						.lowercase()
						// .email({ minDomainSegments: 2 })
						.regex(REGEX.EMAIL)
						.required()
						.messages({
							"string.pattern.base": VALIDATION_MESSAGE.email.pattern
						}),
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
		path: `${SERVER.API_BASE_URL}/v1/admin/reset-password`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const payload: AdminRequest.ChangeForgotPassword = request.payload;
				const reset_status = await redisClient.getValue(`${REDIS_PREFIX.NAME}.${SERVER.ENVIRONMENT}.${payload.email}.${REDIS_SUFFIX.RESET_ATTEMP}`)
				if(!reset_status) return h.response(MESSAGES.ERROR.RESET_PASSWORD_INVALID).code(400);
				const result = await adminControllerV1.resetPassword(payload);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				await adminDaoV1.emptyForgotToken({});
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "admin"],
			description: "Reset Password After forgot password",
			auth: {
				strategies: ["BasicAuth"]
			},
			validate: {
				headers: headerObject["required"],
				payload: Joi.object({
					email: Joi.string()
						.trim()
						.lowercase()
						// .email({ minDomainSegments: 2 })
						.regex(REGEX.EMAIL)
						.required()
						.messages({
							"string.pattern.base": VALIDATION_MESSAGE.email.pattern
						}),
					password: Joi.string()
						.trim()
						.regex(REGEX.PASSWORD)
						.min(VALIDATION_CRITERIA.PASSWORD_MIN_LENGTH)
						.max(VALIDATION_CRITERIA.PASSWORD_MAX_LENGTH)
						.default(SERVER.DEFAULT_PASSWORD)
						.required()
						.messages({
							"string.pattern.base": VALIDATION_MESSAGE.password.pattern,
							"string.min": VALIDATION_MESSAGE.password.minlength,
							"string.max": VALIDATION_MESSAGE.password.maxlength,
							"string.empty": VALIDATION_MESSAGE.password.required,
							"any.required": VALIDATION_MESSAGE.password.required
						})
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
		path: `${SERVER.API_BASE_URL}/v1/admin/change-password`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const payload: ChangePasswordRequest = request.payload;
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;

				const result = await adminControllerV1.changePassword(payload, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "admin"],
			description: "Change Password",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				payload: Joi.object({
					oldPassword: Joi.string()
						.trim()
						.min(VALIDATION_CRITERIA.PASSWORD_MIN_LENGTH)
						.max(VALIDATION_CRITERIA.PASSWORD_MAX_LENGTH)
						.default(SERVER.DEFAULT_PASSWORD)
						.required(),
					password: Joi.string()
						.trim()
						.regex(REGEX.PASSWORD)
						.min(VALIDATION_CRITERIA.PASSWORD_MIN_LENGTH)
						.max(VALIDATION_CRITERIA.PASSWORD_MAX_LENGTH)
						.default(SERVER.DEFAULT_PASSWORD)
						.required()
						.messages({
							"string.pattern.base": VALIDATION_MESSAGE.password.pattern,
							"string.min": VALIDATION_MESSAGE.password.minlength,
							"string.max": VALIDATION_MESSAGE.password.maxlength,
							"string.empty": VALIDATION_MESSAGE.password.required,
							"any.required": VALIDATION_MESSAGE.password.required
						})
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
		path: `${SERVER.API_BASE_URL}/v1/admin/profile`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				const result = await adminControllerV1.adminDetails(tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "admin"],
			description: "Admin Details",
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
	{
		method: "PUT",
		path: `${SERVER.API_BASE_URL}/v1/admin/profile`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const payload: AdminRequest.EditProfile = request.payload;
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				const result = await adminControllerV1.editProfile(payload, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "admin"],
			description: "Edit Profile",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				payload: Joi.object({

					profilePicture: Joi.string().trim().optional().allow(""),
					name: Joi.string()
						.trim()
						.min(VALIDATION_CRITERIA.NAME_MIN_LENGTH)
						.optional(),
					password: Joi.string()
						.trim()
						.regex(REGEX.PASSWORD)
						.min(VALIDATION_CRITERIA.PASSWORD_MIN_LENGTH)
						.max(VALIDATION_CRITERIA.PASSWORD_MAX_LENGTH)
						.optional()
						.messages({
							"string.pattern.base": VALIDATION_MESSAGE.password.pattern,
							"string.min": VALIDATION_MESSAGE.password.minlength,
							"string.max": VALIDATION_MESSAGE.password.maxlength,
							"string.empty": VALIDATION_MESSAGE.password.required,
							"any.required": VALIDATION_MESSAGE.password.required
						})
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
		path: `${SERVER.API_BASE_URL}/v1/admin/dashboard`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				const checkPermission = await roleAndPermission.checkPermission({module:MODULES.DASHBOARD,permission:PERMISSION.VIEW},tokenData)
				if(!checkPermission) return MESSAGES.ERROR.INVALID_ADMIN;
				const result = await adminControllerV1.userOverview();
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "admin"],
			description: "Dashboard",
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
	{
		method: "GET",
		path: `${SERVER.API_BASE_URL}/v1/admin/subadminOverview`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				const checkPermission = await roleAndPermission.checkPermission({module:MODULES.DASHBOARD,permission:PERMISSION.VIEW},tokenData)
				if(!checkPermission) return MESSAGES.ERROR.INVALID_ADMIN;
				const result = await adminControllerV1.subadminOverview(tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "admin"],
			description: "Dashboard",
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
	// {
	// 	method: "GET",
	// 	path: `${SERVER.API_BASE_URL}/v1/admin/users`,
	// 	handler: async (request: Request | any, h: ResponseToolkit) => {
	// 		try {
	// 			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
	// 			const checkPermission = await roleAndPermission.checkPermission({module:MODULES.USER_MANAGEMENT,permission:PERMISSION.VIEW},tokenData)
	// 			if(!checkPermission) return MESSAGES.ERROR.INVALID_ADMIN;
	// 			const query: AdminRequest.UserListing = request.query;
	// 			const result = await adminControllerV1.userList(query,tokenData);
	// 			return responseHandler.sendSuccess(h, result);
	// 		} catch (error) {
	// 			return responseHandler.sendError(request, error);
	// 		}
	// 	},
	// 	config: {
	// 		tags: ["api", "admin"],
	// 		description: "User List",
	// 		auth: {
	// 			strategies: ["AdminAuth"]
	// 		},
	// 		validate: {
	// 			headers: authorizationHeaderObj,
	// 			query: Joi.object({
	// 				pageNo: Joi.number().required().description("Page no"),
	// 				limit: Joi.number().required().description("limit"),
	// 				searchKey: Joi.string().optional().description("Search by name, mobile number"),
	// 				sortBy: Joi.string().trim().valid("name", "created").optional().description("name, created"),
	// 				sortOrder: Joi.number().optional().valid(1, -1).description("1 for asc, -1 for desc"),
	// 				status: Joi.array().items(Joi.string().min(1)).single().optional().description('filter by status: BLOCKED, UN_BLOCKED'),
	// 				fromDate: Joi.number().optional().description("in timestamp"),
	// 				toDate: Joi.number().optional().description("in timestamp"),
	// 				languageCode:Joi.array().items(Joi.string().min(1)).single().optional().description('filter by language'),
	// 				isMigratedUser: Joi.array().items(Joi.boolean()).single().optional().description('filter by MigratedUser: true, false'),
	// 				isExport: Joi.boolean(),
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
	// {
	// 	method: "POST",
	// 	path: `${SERVER.API_BASE_URL}/v1/admin/user/block-unblock`,
	// 	handler: async (request: Request | any, h: ResponseToolkit) => {
	// 		try {
	// 			const payload: AdminRequest.UserStatus = request.payload;
	// 			const tokenData = request.auth && request.auth.credentials;
	// 			const checkPermission = await roleAndPermission.checkPermission({module:MODULES.USER_MANAGEMENT,permission:PERMISSION.EDIT},tokenData.tokenData)
	// 			if(!checkPermission) return MESSAGES.ERROR.INVALID_ADMIN;
	// 			const result = await adminControllerV1.blockUnblockUser(payload, tokenData);
	// 			return responseHandler.sendSuccess(h, result);
	// 		} catch (error) {
	// 			return responseHandler.sendError(request, error);
	// 		}
	// 	},
	// 	config: {
	// 		tags: ["api", "admin"],
	// 		description: "Block/Unblock user",
	// 		auth: {
	// 			strategies: ["AdminAuth"]
	// 		},
	// 		validate: {
	// 			headers: authorizationHeaderObj,
	// 			payload: Joi.object({
	// 				userId: Joi.string().trim().regex(REGEX.MONGO_ID).required(),
	// 				status: Joi.string()
	// 					.trim()
	// 					.valid(STATUS.BLOCKED,STATUS.UN_BLOCKED)
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
	// {
	// 	method: "DELETE",
	// 	path: `${SERVER.API_BASE_URL}/v1/admin/user/{userId}`,
	// 	handler: async (request: Request | any, h: ResponseToolkit) => {
	// 		try {
	// 			const query: AdminRequest.UserStatus = request.query;
	// 			const tokenData = request.auth && request.auth.credentials;
	// 			const checkPermission = await roleAndPermission.checkPermission({module:MODULES.USER_MANAGEMENT,permission:PERMISSION.EDIT},tokenData.tokenData)
	// 			if(!checkPermission) return MESSAGES.ERROR.INVALID_ADMIN;
	// 			const result = await adminControllerV1.deleteUser(query, tokenData);
	// 			return responseHandler.sendSuccess(h, result);
	// 		} catch (error) {
	// 			await adminDaoV1.emptyForgotToken({});
	// 			return responseHandler.sendError(request, error);
	// 		}
	// 	},
	// 	config: {
	// 		tags: ["api", "admin"],
	// 		description: "Delete user",
	// 		auth: {
	// 			strategies: ["AdminAuth"]
	// 		},
	// 		validate: {
	// 			headers: authorizationHeaderObj,
	// 			query: Joi.object({
	// 				userId: Joi.string().trim().regex(REGEX.MONGO_ID).required(),
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
	// {
	// 	method: "GET",
	// 	path: `${SERVER.API_BASE_URL}/v1/admin/user/{userId}`,
	// 	handler: async (request: Request | any, h: ResponseToolkit) => {
	// 		try {
	// 			const query: AdminRequest.UserStatus = request.query;
	// 			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
	// 			const checkPermission = await roleAndPermission.checkPermission({module:MODULES.USER_MANAGEMENT,permission:PERMISSION.VIEW},tokenData)
	// 			if(!checkPermission) return MESSAGES.ERROR.INVALID_ADMIN;
	// 			const result = await adminControllerV1.getUserDetail(query, tokenData);
	// 			return responseHandler.sendSuccess(h, result);
	// 		} catch (error) {
	// 			await adminDaoV1.emptyForgotToken({});
	// 			return responseHandler.sendError(request, error);
	// 		}
	// 	},
	// 	config: {
	// 		tags: ["api", "admin"],
	// 		description: "User Detail",
	// 		auth: {
	// 			strategies: ["AdminAuth"]
	// 		},
	// 		validate: {
	// 			headers: authorizationHeaderObj,
	// 			query: Joi.object({
	// 				userId: Joi.string().trim().regex(REGEX.MONGO_ID).required(),
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
	// {
	// 	method: "GET",
	// 	path: `${SERVER.API_BASE_URL}/v1/admin/sidebar`,
	// 	handler: async (request: Request | any, h: ResponseToolkit) => {
	// 		try {
	// 			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
	// 			const result = await adminControllerV1.getSideBar(tokenData);
	// 			return responseHandler.sendSuccess(h, result);
	// 		} catch (error) {
	// 			return responseHandler.sendError(request, error);
	// 		}
	// 	},
	// 	config: {
	// 		tags: ["api", "admin"],
	// 		description: "SideBar List",
	// 		auth: {
	// 			strategies: ["AdminAuth"]
	// 		},
	// 		validate: {
	// 			headers: authorizationHeaderObj,
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
		path: `${SERVER.API_BASE_URL}/v1/admin/preSignedUrl`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				// const checkPermission = await roleAndPermission.checkPermission({module:MODULES.USER_MANAGEMENT,permission:PERMISSION.EDIT},tokenData)
				// if(!checkPermission) return MESSAGES.ERROR.INVALID_ADMIN;
				const query:AdminRequest.PreSignedUrl = request.query
				const result = await adminControllerV1.preSignedURL(query,tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "admin"],
			description: "presigned URL",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: Joi.object({
					filename: Joi.string().trim().required().description('FileName'),
					fileType: Joi.string().trim().required().description('File Type of filename'),
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
	// {
	// 	method: "GET",
	// 	path: `${SERVER.API_BASE_URL}/v1/admin/personalOverview`,
	// 	handler: async (request: Request | any, h: ResponseToolkit) => {
	// 		try {
	// 			const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
	// 			const checkPermission = await roleAndPermission.checkPermission({module:MODULES.DASHBOARD,permission:PERMISSION.VIEW},tokenData)
	// 			if(!checkPermission) return MESSAGES.ERROR.INVALID_ADMIN;
	// 			const result = await adminControllerV1.personalOverview(tokenData);
	// 			return responseHandler.sendSuccess(h, result);
	// 		} catch (error) {
	// 			return responseHandler.sendError(request, error);
	// 		}
	// 	},
	// 	config: {
	// 		tags: ["api", "admin"],
	// 		description: "Personal Dashboard overview",
	// 		auth: {
	// 			strategies: ["AdminAuth"]
	// 		},
	// 		validate: {
	// 			headers: authorizationHeaderObj,
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
		path: `${SERVER.API_BASE_URL}/v1/admin/periodic-data`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				const query: AdminRequest.GetPeriodicData = request.query;
				const checkPermission = await roleAndPermission.checkPermission({module:MODULES.DASHBOARD,permission:PERMISSION.VIEW},tokenData)
				if(!checkPermission) return MESSAGES.ERROR.INVALID_ADMIN;
				const result = await adminControllerV1.getDashboardPeriodicData(query);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "admin"],
			description: "Dashboard",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: Joi.object({
					fromDate: Joi.number().required(),
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
		path: `${SERVER.API_BASE_URL}/v1/admin/outreach-cases`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				const query: ListingRequest = request.query;
				const checkPermission = await roleAndPermission.checkPermission({module:MODULES.DASHBOARD,permission:PERMISSION.VIEW},tokenData)
				if(!checkPermission) return MESSAGES.ERROR.INVALID_ADMIN;
				const result = await adminControllerV1.getDashboardOutreachCases(query);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "admin"],
			description: "Dashboard",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: Joi.object({
					pageNo: Joi.number().required().description("Page no"),
					limit: Joi.number().required().description("limit"),
					searchKey: Joi.string().allow("").optional().description("Search by DRN"),
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
];