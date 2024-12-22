"use strict";

import { baseDao, BaseDao } from "@modules/baseDao/BaseDao";
import { toObjectId } from "@utils/appUtils";
import { DB_MODEL_REF, DEVICE_TYPE, KAFKA_TOPICS, NOTIFICATION, NOTIFICATION_TYPE, STATUS, USER_TYPE } from "@config/constant";
import { SERVER } from "@config/environment";
import { admins, login_histories, notifications } from "@modules/models";
import { fireBase } from "@lib/firebase";
import { kafkaProducerNotification } from "@lib/kafkaProducer/NotificationRequest";


export class NotificationDao extends BaseDao {
	public modelNotification:any = DB_MODEL_REF.NOTIFICATION

	/**
	 * @function notificationList
	 */
	async notificationList(params: ListingRequest, userId: string) {
		try {
			const aggPipe = [];
			const match: any = {};
			match.receiverId = { "$in": [toObjectId(userId)] };
			match.status = { "$eq": STATUS.ACTIVE };
			aggPipe.push({ "$match": match });

			aggPipe.push({ $sort: { created: -1 } });

			if (params.limit && params.pageNo) {
				const [skipStage, limitStage] = this.addSkipLimit(
					params.limit,
					params.pageNo,
				);
				aggPipe.push(skipStage, limitStage);
			}

			aggPipe.push({
				"$lookup": {
					from: DB_MODEL_REF.ADMIN,
					localField: 'senderId',
					foreignField: '_id',
					pipeline: [
						{ "$project": { profilePicture: 1, status: 1,name:1 } }
					],
					as: "userDetails"
				}
			});

			aggPipe.push({
				$unwind: "$userDetails"
			});
			

			aggPipe.push({
				 "$project": {
					senderId: 1,
					isRead: 1,
					notificationStatus: "$status", 
					message:1,
					details:1,
					senderName:"$userDetails.name",
					profilePicture:"$userDetails.profilePicture",
					senderStatus:"$userDetails.status",
					created:1,
					type:1
					} 
				});


			return await this.dataPaginate(this.modelNotification, aggPipe, params.limit, params.pageNo, {});
		} catch (error) {
			throw error;
		}
	}


	/**
     * @function sendNotificationsToUsers
     */
	async sendNotificationsToUsers(params, tokenData: TokenData) {
		try {
			let notificationData: any;
			let platform: string = ""
			let query: any = {};
			let userName: any;
			const adminModel: any = DB_MODEL_REF.ADMIN
			userName = await this.findOne(adminModel, { _id: toObjectId(tokenData.userId.toString()) })

			params.userName = userName?.name || '';
			console.log('>>>>>>>>>>>params', params, '<<<<<<<<<<<<<<<<<')

			query = {
				"userId._id": { $in: params.receiverId },
				"userId.status": STATUS.UN_BLOCKED,
				"userId.userType": {$in : [USER_TYPE.ADMIN, USER_TYPE.SUB_ADMIN]},
			};
			notificationData = NOTIFICATION(NOTIFICATION_TYPE.SEND_NOTIFICATION, params);
			const messageData = {
				query: query,
				notificationData: notificationData,
				tokenData: tokenData
			}
			await kafkaProducerNotification.sendResponse(JSON.stringify(messageData), KAFKA_TOPICS.NOTIFICATION_RESPONSE)
			// return await this.sendBulkNotification(query, notificationData, tokenData)
		} catch (error) {
			throw error;
		}
	}



	/**
	  * @function sendBulkNotification
	  * @description function will used for bulk notificaiton
	  */
	async sendBulkNotification(query: any, notificationData: any, tokenData: TokenData) {
		try {
			const userToken = login_histories.find(query, { userId: 1, deviceToken: 1, deviceId: 1, platform: 1, isLogin: 1 }).cursor({ "batchSize": SERVER.CHUNK_SIZE });
			const processedUserIds = new Map();
			userToken.on("data", async function (doc) {
				console.log(doc, ':::::::::::::::::');
				const token = doc.deviceToken;
				const userId = toObjectId(doc.userId._id).toString();
				if (
					!processedUserIds.has(userId)
				) {
					processedUserIds.set(userId, true);
					const query_notification = {
						senderId: toObjectId(tokenData.userId),
						receiverId: userId,
						type: notificationData.type,
						title: notificationData.title,
						message: notificationData.message,
						details: notificationData.details
					};
					await Promise.all([
						notifications.insertMany(query_notification),
						admins.updateOne({ _id: doc.userId._id }, { $inc: { notificationCount: 1 } })
					]);
				}
				if (token !== undefined && doc.isLogin) {
					console.log(`createPayload for push notification invoked`);
					await fireBase.sendPushNotification(token, notificationData);
				}
			});
		} catch (error) {
			throw error;
		}
	}


	async updateReadStatus(params:NotificationRequest.Read,tokenData:TokenData){
		try{
			const match:any = {};

			match.receiverId = toObjectId(tokenData.userId.toString());
			match.isRead = false
			if(params.notificationId){
				match._id = toObjectId(params.notificationId)
				match.status = STATUS.ACTIVE

			} 
			const update = {
				$set:{
					isRead:true
				}
			}
			const options = {};
			return await this.updateMany(this.modelNotification,match,update,options);
			
		}catch(error){
			throw error
		}
	}

}

export const notificationDao = new NotificationDao();
