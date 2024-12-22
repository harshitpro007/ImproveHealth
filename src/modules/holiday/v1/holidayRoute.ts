"use strict";

import { Request, ResponseToolkit } from "@hapi/hapi";
import * as Joi from "joi";

import { failActionFunction } from "@utils/appUtils";
import { holidayControllerV1 } from "@modules/holiday/index";
import {
	REGEX,
	SWAGGER_DEFAULT_RESPONSE_MESSAGES,
	SERVER,
	MODULES,
	PERMISSION,
	MESSAGES,
} from "@config/index";
import { responseHandler } from "@utils/ResponseHandler";
import { authorizationHeaderObj } from "@utils/validator";
import { roleAndPermission } from "@modules/permission/roleAndPermission";

export const holidayRoute = [
	{
		method: "POST",
		path: `${SERVER.API_BASE_URL}/v1/holiday`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				const checkPermission = await roleAndPermission.checkPermission({module:MODULES.HOLIDAY_MANAGEMENT,permission:PERMISSION.ADD},tokenData)
				if(!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
				const payload: HolidayRequest.Add = request.payload;
				const result = await holidayControllerV1.addHoliday(payload, tokenData);

				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "Holiday"],
			description: "Add new holiday",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				payload: Joi.object({
					holidayDate: Joi.array().items(
						Joi.object({
							name: Joi.string()
								.trim()
								.description("Name of holiday")
								.required(),
							date: Joi.number().required().description("in timestamp"),
						})
					).required(),
					import: Joi.boolean().optional(),
					fileName: Joi.string().trim().optional()
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
		method: "PUT",
		path: `${SERVER.API_BASE_URL}/v1/holiday`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				const checkPermission = await roleAndPermission.checkPermission({module:MODULES.HOLIDAY_MANAGEMENT,permission:PERMISSION.EDIT},tokenData)
				if(!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
				const payload: HolidayRequest.Edit = request.payload;
				const result = await holidayControllerV1.editHoliday(payload, tokenData);

				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "Holiday"],
			description: "Edit holiday date",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				payload: Joi.object({
					holidayId: Joi.string().trim().regex(REGEX.MONGO_ID).required(),
					name: Joi.string().trim().required(),
					date: Joi.number().required().description("in timestamp"),
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
		path: `${SERVER.API_BASE_URL}/v1/holiday`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				const checkPermission = await roleAndPermission.checkPermission({module:MODULES.HOLIDAY_MANAGEMENT,permission:PERMISSION.DELTETE},tokenData)
				if(!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
				const query: HolidayRequest.Delete = request.query;

				const result = await holidayControllerV1.deleteHoliday(query, tokenData);

				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "Holiday"],
			description: "Delete holiday date",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: Joi.object({
					holidayId: Joi.string().trim().regex(REGEX.MONGO_ID).required().description("Holiday Id"),
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
		path: `${SERVER.API_BASE_URL}/v1/holiday`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				const checkPermission = await roleAndPermission.checkPermission({module:MODULES.HOLIDAY_MANAGEMENT,permission:PERMISSION.VIEW},tokenData)
				if(!checkPermission) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
				const query: HolidayRequest.Get = request.query;

				const result = await holidayControllerV1.getHolidayList(query);

				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "Holiday"],
			description: "Get holiday date list",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: Joi.object({
					fromDate: Joi.number().required().description('Enter Start date'),
					endDate: Joi.number().required().description('Enter End date'),
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
];