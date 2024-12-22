"use strict";

import { Request, ResponseToolkit } from "@hapi/hapi";
import * as Joi from "joi";

import { failActionFunction } from "@utils/appUtils";
import { authorizationHeaderObj } from "@utils/validator";
import {
	SWAGGER_DEFAULT_RESPONSE_MESSAGES,
	SERVER,
	MODULES,
	PERMISSION,
	MESSAGES,
	DEVICE_TYPE,
	REGEX
} from "@config/index";
import { notificationControllerV1 } from "@modules/notification/index";
import { responseHandler } from "@utils/ResponseHandler";
import { roleAndPermission } from "@modules/permission/roleAndPermission";

export const notificationRoute = [
	{
		method: "GET",
		path: `${SERVER.API_BASE_URL}/v1/notification`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const query: ListingRequest = request.query;
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				// const checkPermission = await roleAndPermission.checkPermission({module:MODULES.NOTIFICATION_MANAGEMENT,permission:PERMISSION.VIEW},tokenData)
			// if(!checkPermission) return MESSAGES.ERROR.INVALID_ADMIN;
				const result = await notificationControllerV1.notificationList(query, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "notification"],
			description: "Notification List",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: Joi.object({
					pageNo: Joi.number().required().description("Page no"),
					limit: Joi.number().required().description("limit"),
					searchKey: Joi.string().allow("").optional().description("Search by title"),
					sortBy: Joi.string().trim().valid("created").optional().description("Sort by created"),
					sortOrder: Joi.number().valid(1, -1).optional().description("1 for asc, -1 for desc"),
					fromDate: Joi.number().optional().description("in timestamp"),
					toDate: Joi.number().optional().description("in timestamp")
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
		path: `${SERVER.API_BASE_URL}/v1/notification`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				const payload: NotificationRequest.Read = request.payload;
				const result = await notificationControllerV1.updateReadStatus(payload,tokenData);

				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "notification"],
			description: "Update Notification Read Status",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				payload: Joi.object({
					notificationId: Joi.string().trim().optional().regex(REGEX.MONGO_ID).description("Notification ID"),
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
