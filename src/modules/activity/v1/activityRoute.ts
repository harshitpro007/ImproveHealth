"use strict";

import { Request, ResponseToolkit } from "@hapi/hapi";
import * as Joi from "joi";

import { failActionFunction } from "@utils/appUtils";
import { activityControllerV1 } from "@modules/activity/index";
import {
	REGEX,
	SWAGGER_DEFAULT_RESPONSE_MESSAGES,
	SERVER,
} from "@config/index";
import { responseHandler } from "@utils/ResponseHandler";
import { authorizationHeaderObj } from "@utils/validator";
import { roleAndPermission } from "@modules/permission/roleAndPermission";

export const activityRoute = [
	{
		method: "POST",
		path: `${SERVER.API_BASE_URL}/activity/download-file-log`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const tokenData: TokenData = request.auth && request.auth.credentials && request.auth.credentials.tokenData;
				const payload: ActivityRequest.loginActivity = request.payload
				const result = await activityControllerV1.caseDownLoadFilesActivityLog(payload, tokenData);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "activity"],
			description: "Download file log Activity",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				payload: Joi.object({
					name: Joi.string().trim().optional(),
					url: Joi.string().optional(),
					disputeId: Joi.string().trim().regex(REGEX.MONGO_ID).optional(),
					allDownload: Joi.boolean().default(false)
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