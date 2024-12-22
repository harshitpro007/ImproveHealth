"use strict";

import * as _ from "lodash";
import * as crypto from "crypto";
import * as mongoose from "mongoose";
import * as promise from "bluebird";
import {
	buildToken,
	encryptHashPassword,
	getRandomOtp,
	getLocationByIp,
	matchOTP,
} from "@utils/appUtils";
import {
	JOB_SCHEDULER_TYPE,
	MESSAGES,
	STATUS,
	TOKEN_TYPE,
	SERVER,
	UPDATE_TYPE,
	DB_MODEL_REF,
} from "@config/index";
import { userDaoV1 } from "@modules/user/index"
import { baseDao } from "@modules/baseDao/index";
import { loginHistoryDao } from "@modules/loginHistory/index";
import { redisClient } from "@lib/redis/RedisClient";
import { sendMessageToFlock } from "@utils/FlockUtils";
import { createToken } from "@lib/tokenManager";
import { mailManager } from "@lib/MailManager";

export class UserController {

	private modelLoginHistory: any;
	private modelUser: any;
	constructor(){
		this.modelLoginHistory = DB_MODEL_REF.LOGIN_HISTORY;
		this.modelUser = DB_MODEL_REF.USER;
	} 

	/**
	 * @function removeSession
	 * @description Remove the user login session
	 */
	async removeSession(params, isSingleSession: boolean) {
		try {
			if (isSingleSession)
				await loginHistoryDao.removeDeviceById({ "userId": params.userId });
			else
				await loginHistoryDao.removeDeviceById({ "userId": params.userId, "deviceId": params.deviceId });

			if (SERVER.IS_REDIS_ENABLE) {
				if (isSingleSession) {
					let keys: any = await redisClient.getKeys(`*${params.userId}.*`);
					keys = keys.filter(v1 => Object.values(JOB_SCHEDULER_TYPE).findIndex(v2 => v2 === v1.split(".")[0]) === -1);
					console.log("removed keys are => ",keys);
					if (keys.length) await redisClient.deleteKey(keys);
				} else
					await redisClient.deleteKey(`${params.userId}.${params.deviceId}`);
			}
		} catch (error) {
			sendMessageToFlock({ "title": "_removeSession", "error": error.stack });
		}
	};

	/**
	 * @function updateUserDataInRedis
	 * @description this function used to update the user data in redis
	 */
	async updateUserDataInRedis(params, isAlreadySaved = false) {
		try {
			delete params.salt;
			if (SERVER.IS_REDIS_ENABLE) {
				let keys: any = await redisClient.getKeys(`*${params.userId || params._id.toString()}.*`);
				keys = keys.filter(v1 => Object.values(JOB_SCHEDULER_TYPE).findIndex(v2 => v2 === v1.split(".")[0]) === -1);
				const promiseResult = [], array = [];
				for (let i = 0; i < keys.length; i++) {
					if (isAlreadySaved) {
						let userData: any = await redisClient.getValue(`${params.userId || params._id.toString()}.${keys[i].split(".")[1]}`);
						array.push(keys[i]);
						array.push(JSON.stringify(buildToken(_.extend(JSON.parse(userData), params))));
						promiseResult.push(userData);
					} else {
						array.push(keys[i]);
						array.push(JSON.stringify(buildToken(params)));
					}
				}
				await Promise.all(promiseResult);
				if (array.length) redisClient.mset(array);
			}
			return {};
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function updateUserDataInDb
	 * @description this function used to update the user data in DB
	 */
	async updateUserDataInDb(params) {
		try {
			await baseDao.updateMany(this.modelLoginHistory, { "userId._id": params._id }, { "$set": { userId: params } }, {});

			return {};
		} catch (error) {
			throw error;
		}
	}


	/**
	 * @function signUp
	 * @description signup of participant/supporter
	 * @param params.email: user's email (required)
	 * @param params.password: user's password (required)
	 * @param params.userType: user type (required)
	 */
	async signUp(params: UserRequest.SignUp) {
		// MongoDB transactions
		const session = await mongoose.startSession();
		session.startTransaction();
		try {
			const otp = getRandomOtp(4).toString();
			const fullMobileNo= params.countryCode+params.mobileNo;
			console.log('`mobile full', fullMobileNo)
			if (SERVER.IS_REDIS_ENABLE) redisClient.setExp(fullMobileNo, (SERVER.TOKEN_INFO.EXPIRATION_TIME.VERIFY_MOBILE / 1000), JSON.stringify({ "fullMobileNo": fullMobileNo, "otp": otp }));
			const isExist = await userDaoV1.isMobileExists(params); 
			if (isExist) {
				if(!isExist.isMobileVerified) Promise.reject(MESSAGES.ERROR.MOBILE_NO_NOT_VERIFIED)

				return MESSAGES.SUCCESS.SIGNUP_VERIFICATION({
					userId: isExist._id,
					mobileNo: params.mobileNo,
					countryCode: params.countryCode,
					isMobileVerified: isExist.isMobileVerified,
					ownLanguage: isExist.ownLanguage,
					preferredLanguage: isExist.preferredLanguage,
					name: isExist.name
				});
			} else {
				params.fullMobileNo= fullMobileNo
				const step1= await userDaoV1.signUp(params, session);
				console.log('step1',step1)
				await session.commitTransaction();
				session.endSession();
				return MESSAGES.SUCCESS.SIGNUP_VERIFICATION({
					userId: step1._id,
					mobileNo: params.mobileNo,
					countryCode: params.countryCode,
					isMobileVerified: step1.isMobileVerified
				});
			}
		} catch (error) {
			// MongoDB transactions
			await session.abortTransaction();
			session.endSession();
			throw error;
		}
	}

	// /**
	//  * @function sendOTP
	//  * @description send/resend otp on email/phone number
	//  * @param params.email: user's email (required)   
	//  */
	// async sendOTP(params: UserRequest.SendOtp) {
	// 	try {
	// 		const step1 = await userDaoV1.isMobileExists(params);
	// 		if (!step1) return Promise.reject(MESSAGES.ERROR.MOBILE_NOT_REGISTERED);
	// 		if (step1.status === STATUS.BLOCKED) return Promise.reject(MESSAGES.ERROR.BLOCKED);
	// 		const fullMobileNo= params.countryCode+params.mobileNo;
	// 		const otp = getRandomOtp(4).toString();
	// 		if (SERVER.IS_REDIS_ENABLE) redisClient.setExp(fullMobileNo, (SERVER.TOKEN_INFO.EXPIRATION_TIME.VERIFY_MOBILE / 1000), JSON.stringify({ "fullMobileNo": fullMobileNo, "otp": otp }));
	// 		return MESSAGES.SUCCESS.SEND_OTP;
	// 	} catch (error) {
	// 		throw error;
	// 	}
	// }

	/**
	 * @function verifyOTP
	 * @description verify otp on forgot password/verify number
	 * @param params.email: user's email (required)
	 * @param params.otp: otp (required)
	 */
	async verifyOTP(params: UserRequest.VerifyOTP) {
		try {
			const step1 = await userDaoV1.isMobileExists(params);
			if (!step1) return Promise.reject(MESSAGES.ERROR.MOBILE_NOT_REGISTERED);			
			let step2 = await redisClient.getValue(step1.fullMobileNo);
			const isOTPMatched = await matchOTP(params.otp, step2);
			if (!isOTPMatched) return Promise.reject(MESSAGES.ERROR.INVALID_OTP);
			let dataToReturn = {};
			await baseDao.updateOne(this.modelUser, { "fullMobileNo": step1.fullMobileNo }, { "$set": { isMobileVerified: true } }, {});
			const salt = crypto.randomBytes(64).toString("hex");
			const tokenData = {
				"userId": step1._id,
				"deviceId": params.deviceId,
				"accessTokenKey": salt,
				"type": TOKEN_TYPE.USER_LOGIN,
				"userType": step1.userType
			};
			const location = await getLocationByIp(params.remoteAddress); // get location (timezone, lat, lng) from ip address
			const [step3, accessToken] = await promise.join(
				loginHistoryDao.createUserLoginHistory({ ...params, ...step1, salt, location }),
				createToken(tokenData)
			);
			if (SERVER.IS_REDIS_ENABLE) redisClient.setExp(`${step1._id.toString()}.${params.deviceId}`, Math.floor(SERVER.TOKEN_INFO.EXPIRATION_TIME[TOKEN_TYPE.USER_LOGIN] / 1000), JSON.stringify(buildToken({ ...step1, ...params, salt })));

			dataToReturn = {
				accessToken,
				"userId": step1._id,
				"mobileNo": step1?.mobileNo,
				countryCode: step1?.countryCode,
				isMobileVerified: step1?.isMobileVerified,
				name: step1.name,
				profilePicture: step1.profilePicture,
				about: step1.abortTransaction
			};
			return MESSAGES.SUCCESS.VERIFY_OTP(dataToReturn);
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function forgotPassword
	 * @description This funciton is used to forgot password of user
	 */
	async forgotPassword(params: UserRequest.ForgotPassword) {
		try {
			const step1 = await userDaoV1.isEmailExists(params); // check is email exist if not then restrict to send forgot password mail
			if (!step1) return Promise.reject(MESSAGES.ERROR.EMAIL_NOT_REGISTERED);
			else if (step1.status === STATUS.BLOCKED) return Promise.reject(MESSAGES.ERROR.BLOCKED);
			else {
				let otp = getRandomOtp(5).toString();
				console.log(otp);
				if (SERVER.IS_REDIS_ENABLE) redisClient.setExp(params.email, (SERVER.TOKEN_INFO.EXPIRATION_TIME.VERIFY_EMAIL / 1000), JSON.stringify({ "email": params.email, "otp": otp }));
				mailManager.forgotPasswordMail({ "email": params.email, "name": step1.name, "otp": otp });
				return MESSAGES.SUCCESS.SEND_OTP;
			}
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function resetPassword
	 * @author Chitvan Baish
	 * @description this function reset the new password of user
	 */
	async resetPassword(params: UserRequest.ChangeForgotPassword) {
		try {
			if (params.newPassword !== params.confirmPassword) return Promise.reject(MESSAGES.ERROR.NEW_CONFIRM_PASSWORD);
			const step1 = await userDaoV1.isEmailExists(params); // check is email exist if not then restrict to send forgot password mail
			if (!step1) return Promise.reject(MESSAGES.ERROR.EMAIL_NOT_REGISTERED);
			params.hash = encryptHashPassword(params.newPassword, step1.salt);
			await userDaoV1.changePassword(params);
			return MESSAGES.SUCCESS.RESET_PASSWORD;
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function logout
	 * @author Chitvan Baish
	 * @description this function is used to logout the user
	 */
	async logout(tokenData: TokenData) {
		try {
			await this.removeSession(tokenData, SERVER.IS_SINGLE_DEVICE_LOGIN[tokenData.userType]);
			return MESSAGES.SUCCESS.USER_LOGOUT;
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function profile
	 * @author Chitvan Baish
	 * @description View the profile of user 
	 */
	async profile(params: UserId, tokenData: TokenData) {
		try {
			const step1 = await userDaoV1.findUserById(params.userId || tokenData.userId,{preferredLanguage:1,ownLanguage:1,about:1, profilePicture:1, name:1, mobileNo:1 ,countryCode:1,isMobileVerified:1});
			if (!step1) return Promise.reject(MESSAGES.ERROR.USER_NOT_FOUND);			
			return MESSAGES.SUCCESS.DETAILS(step1);
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function verifyUser
	 * @description This function is used to verify the user
	 */
	async verifyUser(params: UserRequest.VerifyUser) {
		try {
			params["updateType"] = UPDATE_TYPE.APPROVED_DECLINED;
			if (!params.isApproved) params.declinedReason = params.reason;
			const step1 = await userDaoV1.verifyUser(params);
			if (!params.isApproved) {
				const userName = `${step1?.firstName} ${step1?.lastName}`;
				mailManager.verificationStatus({ "email": step1.email, "name": userName, "reason": params.reason });
			}
			return params.isApproved ? MESSAGES.SUCCESS.VERIFICATION_APPROVED : MESSAGES.SUCCESS.VERIFICATION_REJECTED;
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function editProfilePic
	 * @description Edit the profile of user
	 */
	async editProfile(params: UserRequest.EditProfile, tokenData: TokenData) {
		try {
			const userId = tokenData.userId;
      await userDaoV1.editProfile(params, userId);
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function editSetting
	 * @description Edit the setting of users Like disable notification
	 */
	async editSetting(params: UserRequest.Setting, tokenData: TokenData) {
		try {
			await userDaoV1.updateOne(this.modelUser, { "_id": tokenData.userId }, params, {});
			await loginHistoryDao.updateOne(this.modelLoginHistory, { "userId._id": tokenData.userId, isLogin: true }, { "userId.pushNotificationStatus": params.pushNotificationStatus }, {})
			return MESSAGES.SUCCESS.DEFAULT;
		} catch (error) {
			throw error;
		}
	}



	/**
	 * @function manageNotification
	 * @description this function used to manage the notification
	 */
	async manageNotification(params: UserRequest.ManageNotification, tokenData: TokenData) {
		try {
			if (("pushNotificationStatus" in params) && (params.pushNotificationStatus || !params.pushNotificationStatus)) {
				await baseDao.updateOne(this.modelUser, { "_id": tokenData.userId }, { "$set": { pushNotificationStatus: params.pushNotificationStatus } }, {});
				baseDao.updateMany(this.modelLoginHistory, { "userId": tokenData.userId }, { "$set": { "userId.pushNotificationStatus": params.pushNotificationStatus } }, {});
			}
			if (("groupaNotificationStatus" in params) && (params.groupaNotificationStatus || !params.groupaNotificationStatus)) {
				await baseDao.updateOne(this.modelUser, { "_id": tokenData.userId }, { "$set": { groupaNotificationStatus: params.groupaNotificationStatus } }, {});
				baseDao.updateMany(this.modelLoginHistory, { "userId": tokenData.userId }, { "$set": { "userId.groupaNotificationStatus": params.groupaNotificationStatus } }, {});
			}
			return MESSAGES.SUCCESS.PROFILE_SETTINGS;
		} catch (error) {
			throw error;
		}
	}



}

export const userController = new UserController();