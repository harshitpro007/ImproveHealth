"use strict";

import { MESSAGES } from "@config/constant";
import { SERVER } from "@config/environment";
import { baseDao } from "@modules/baseDao";
import { notificationDaoV1 } from "@modules/notification/index";
import { toObjectId } from "@utils/appUtils";
import axios from 'axios';

export class NotificationController {

	/**
	 * @function notificationList
	 * @description function will the list of all notificaiton
	 */
	async notificationList(params: ListingRequest, tokenData: TokenData) {
		try {
			const step1 = await notificationDaoV1.notificationList(params, tokenData.userId);
			return MESSAGES.SUCCESS.LIST_DATA(step1);
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function updateReadStatus
	 * @description function will maintain the status of notification
	 */
	async updateReadStatus(params:NotificationRequest.Read,tokenData:TokenData){
		try{
			const result =  await notificationDaoV1.updateReadStatus(params,tokenData)
			return MESSAGES.SUCCESS.NOTIFICATION_UPDATED({count:result.nModified})
		}catch(error){
			throw error
		}
	}
	
}

export const notificationController = new NotificationController();
