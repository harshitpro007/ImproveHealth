"use strict";

import * as _ from "lodash";
import * as crypto from "crypto";
import * as promise from "bluebird";

import { encryptHashPassword, getRandomOtp, matchPassword, matchOTP } from "@utils/appUtils";
import { MESSAGES, STATUS, USER_TYPE, TOKEN_TYPE, SERVER, DB_MODEL_REF, GEN_STATUS, ENVIRONMENT, REDIS_SUFFIX, REDIS_PREFIX } from "@config/index";
import { adminDaoV1 } from "@modules/admin/index";
import { loginHistoryDao } from "@modules/loginHistory/index"
import { baseDao } from "@modules/baseDao/index";
import { mailManager } from "@lib/MailManager";
import { createRefreshToken, createToken, validate } from "@lib/tokenManager";
import { redisClient } from "@lib/redis/RedisClient";
import { activityControllerV1 } from "@modules/activity";
const AWS = require('aws-sdk');


class AdminController {

	private modelLoginHistory: any;
	constructor() {
		this.modelLoginHistory = DB_MODEL_REF.LOGIN_HISTORY;
	}

	/**
	 * @function updateUserDataInDb
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
	 * @function login
	 * @description This function used to login the admin
	 */
	async login(params: AdminRequest.Login) {
		try {
			const model: any = DB_MODEL_REF.ADMIN;
			const step1 = await adminDaoV1.isEmailExists(params);
			if (!step1) return Promise.reject(MESSAGES.ERROR.EMAIL_NOT_REGISTERED);
			if (step1.status === GEN_STATUS.BLOCKED) return Promise.reject(MESSAGES.ERROR.BLOCKED);
			const isPasswordMatched = await matchPassword(params.password, step1.hash, step1.salt);
			console.log('isPasswordMatched', isPasswordMatched)
			if (!isPasswordMatched) return Promise.reject(MESSAGES.ERROR.INCORRECT_PASSWORD);
			else {
				if (step1.status === GEN_STATUS.PENDING) {
					await adminDaoV1.updateStatus({ userId: step1._id });
					step1.status = STATUS.UN_BLOCKED;
				}
				await loginHistoryDao.removeDeviceById({ "userId": step1._id });
				const salt = crypto.randomBytes(64).toString("hex");
				const tokenData = {
					"userId": step1._id,
					"deviceId": params.deviceId,
					"accessTokenKey": salt,
					"type": TOKEN_TYPE.ADMIN_LOGIN,
					"userType": step1.userType
				};
				const [step2, accessToken, refreshToken] = await promise.join(
					loginHistoryDao.createUserLoginHistory({ ...params, ...step1, salt }),
					createToken(tokenData),
					createRefreshToken(tokenData)
				);

				await adminDaoV1.findOneAndUpdate(
					model,
					{ _id: step1._id },
					{ refreshToken }
				  );
				await redisClient.deleteKey(`${REDIS_PREFIX.NAME}.${SERVER.ENVIRONMENT}.${step1.email}.${REDIS_SUFFIX.INVITE}`)
				delete step1.salt; delete step1.hash; delete step1.createdAt;
				activityControllerV1.loginActivity(step1._id);
				return MESSAGES.SUCCESS.LOGIN({ accessToken, refreshToken, ...step1 });
			}
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function refreshToken
	 * @description This function generate the new access token
	 * @param params.refreshToken (required)
	 */
	async refreshToken(params: AdminRequest.RefreshToken){
		try{
			const model: any = DB_MODEL_REF.ADMIN;
			const isTokenExist = await adminDaoV1.findOne(model, {
				refreshToken: params.refreshToken,
			  });
			  if (!isTokenExist)
				return Promise.reject(MESSAGES.ERROR.INVALID_REFRESH_TOKEN);
			  const payload = await validate(params.refreshToken, undefined, false);
			  const step1 = await adminDaoV1.findAdminById(payload.sub);
			  if(!step1) return Promise.reject(MESSAGES.ERROR.USER_NOT_FOUND)

			  await loginHistoryDao.removeDeviceById({ "userId": step1._id });
			  const salt = crypto.randomBytes(64).toString("hex");
			  const tokenData = {
				userId: payload.sub,
				deviceId: params.deviceId,
				accessTokenKey: salt,
				type: TOKEN_TYPE.ADMIN_LOGIN,
				userType: payload.aud,
			  };
			  
			  const [step2, accessToken, refreshToken] = await promise.join(
				loginHistoryDao.createUserLoginHistory({
				  ...params,
				  ...step1,
				  salt,
				}),
				createToken(tokenData),
				createRefreshToken(tokenData)
			  );
			  await adminDaoV1.findOneAndUpdate(
				model,
				{ _id: payload.sub },
				{ refreshToken }
			  );
			  return MESSAGES.SUCCESS.DETAILS({ accessToken, refreshToken });
		}
		catch(error){
			console.log("Error in generating referesh Token: ", error);
			throw error;
		}
	}

	/**
	 * @function logout
	 * @description this function used to logout admin
	 */
	async logout(tokenData: TokenData) {
		try {
			await loginHistoryDao.removeDeviceById(tokenData);
			return MESSAGES.SUCCESS.LOGOUT;
		} catch (error) {
			throw error;
		}
	}

	/**   	
	 * @function forgotPassword  
	 * @description this function used to send code for forgot passward  
	 */
	async forgotPassword(params: AdminRequest.ForgotPasswordRequest) {
		try {
			const step1 = await adminDaoV1.isEmailExists(params);
			if (!step1) return Promise.reject(MESSAGES.ERROR.EMAIL_NOT_REGISTERED);
			if (step1.status === STATUS.BLOCKED)
				return Promise.reject(MESSAGES.ERROR.BLOCKED);
			const email = params.email;

			const environment: Array<string> = [
				ENVIRONMENT.PRODUCTION,
				ENVIRONMENT.PREPROD,
				ENVIRONMENT.DEV,
				ENVIRONMENT.QA,
				ENVIRONMENT.LOCAL
			];

			const otp_count: any = await redisClient.getValue(
				`${REDIS_PREFIX.NAME}.${SERVER.ENVIRONMENT}.${email}.${REDIS_SUFFIX.OTP_ATTEMP}`
			);
			if (otp_count && JSON.parse(otp_count).count > 4)
				return Promise.reject(MESSAGES.ERROR.LIMIT_EXCEEDS);

			if (environment.includes(SERVER.ENVIRONMENT)) {
				const otp = getRandomOtp(4).toString();
	
				redisClient.setExp(
					email,
					SERVER.TOKEN_INFO.EXPIRATION_TIME.FORGOT_PASSWORD / 1000,
					JSON.stringify({ email: email, otp: otp })
				);
				let link = `${SERVER.ADMIN_URL}/account/otp`;
				await mailManager.forgotPasswordMail({ "email": params.email, "name": step1.name, otp: otp, "link": link});
	
				if (SERVER.IS_REDIS_ENABLE){
					redisClient.setExp(
						`${REDIS_PREFIX.NAME}.${SERVER.ENVIRONMENT}.${email}.${REDIS_SUFFIX.OTP_ATTEMP}`,
						SERVER.TOKEN_INFO.EXPIRATION_TIME.OTP_LIMIT / 1000,
						JSON.stringify({
							fullMobileNo: email,
							count: JSON.parse(otp_count)
								? JSON.parse(otp_count).count + 1
								: 1,
						})
					);
				}
			}
			else {
				if (SERVER.IS_REDIS_ENABLE)
				  redisClient.setExp(
					email,
					SERVER.TOKEN_INFO.EXPIRATION_TIME.FORGOT_PASSWORD / 1000,
					JSON.stringify({
					  email: email,
					  otp: SERVER.DEFAULT_OTP,
					})
				);
			}
			return MESSAGES.SUCCESS.FORGOT_PASSWORD;
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function verifyOTP
	 * @description verify otp on forgot password
	 * @param params.email: admin's email (required)
	 * @param params.otp: otp (required)
	 */
	async verifyOTP(params: VerifyOTP) {
		try {
			const BYPASS_OTP = SERVER.BYPASS_OTP;
			const step1 = await adminDaoV1.isEmailExists(params);
			console.log("step1", step1);
			if (!step1) return Promise.reject(MESSAGES.ERROR.EMAIL_NOT_REGISTERED);
			if (step1.status === STATUS.BLOCKED)
				return Promise.reject(MESSAGES.ERROR.BLOCKED);
			let step2 = await redisClient.getValue(step1.email);

			let isOTPMatched = await matchOTP(params.otp, step2);
			const environment: Array<string> = [
				ENVIRONMENT.PRODUCTION,
				ENVIRONMENT.PREPROD,
			];
			if (environment.includes(SERVER.ENVIRONMENT) && params.otp == BYPASS_OTP)
				isOTPMatched = true;

			if (!isOTPMatched) {
				return Promise.reject(MESSAGES.ERROR.INVALID_OTP);
			}

			const dataToReturn = {
				userId: step1._id,
				email: step1?.email,
				name: step1.name,
				userType: step1.userType,
			};
			redisClient.deleteKey(`${REDIS_PREFIX.NAME}.${SERVER.ENVIRONMENT}.${params.email}.${REDIS_SUFFIX.OTP_ATTEMP}`);
			redisClient.setExp(
				`${REDIS_PREFIX.NAME}.${SERVER.ENVIRONMENT}.${step1.email}.${REDIS_SUFFIX.RESET_ATTEMP}`,
				SERVER.TOKEN_INFO.EXPIRATION_TIME.RESET / 1000,
				JSON.stringify({ email: step1.email})
			);			
			return MESSAGES.SUCCESS.VERIFY_OTP(dataToReturn);
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function resetPassword
	 * @author Chitvan Baish
	 * @description This function used to enter new password
	 */
	async resetPassword(params: AdminRequest.ChangeForgotPassword) {
		try {
			console.log(params);
			const step1 = await adminDaoV1.isEmailExists(params)
			if (!step1) return Promise.reject(MESSAGES.ERROR.EMAIL_NOT_REGISTERED);
			const isPasswordMatched = await matchPassword(params.password, step1.hash, step1.salt);
			if(isPasswordMatched) return Promise.reject(MESSAGES.ERROR.ENTER_NEW_PASSWORD)
			params.hash = encryptHashPassword(params.password, step1.salt);
			await adminDaoV1.changePassword(params, step1._id);
			redisClient.deleteKey(`${REDIS_PREFIX.NAME}.${SERVER.ENVIRONMENT}.${params.email}.${REDIS_SUFFIX.RESET_ATTEMP}`)
			return MESSAGES.SUCCESS.RESET_PASSWORD;
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function changePassword
	 * @description this function used to change the admin password
	 */
	async changePassword(params: ChangePasswordRequest, tokenData: TokenData) {
		try {
			if(params.oldPassword == params.password)return Promise.reject(MESSAGES.ERROR.ENTER_NEW_PASSWORD);
			const step1 = await adminDaoV1.findAdminById(tokenData.userId, { salt: 1, hash: 1 });
			const oldHash = encryptHashPassword(params.oldPassword, step1.salt);
			if (oldHash !== step1.hash) return Promise.reject(MESSAGES.ERROR.INVALID_OLD_PASSWORD);
			params.hash = encryptHashPassword(params.password, step1.salt);
			await adminDaoV1.changePassword(params, tokenData.userId);
			await loginHistoryDao.removeDeviceById(tokenData);
			return MESSAGES.SUCCESS.CHANGE_PASSWORD;
		} catch (error) {
			throw error;
		}
	}


	/**
	 * @function adminDetails
	 * @description this function used to get the admin details
	 */
	async adminDetails(tokenData: TokenData) {
		try {
			let model: any = DB_MODEL_REF.ROLE
			let admin = await adminDaoV1.findAdminById(tokenData.userId);
			let session = await loginHistoryDao.findDeviceLastLogin(tokenData);
			const permission = admin.roleId ? await adminDaoV1.findOne(model, admin.roleId, { role: 1, permission: 1 }) : [];
			console.log(admin)
			let details = {
				"userId": admin._id,
				"email": admin.email,
				"name": admin.name,
				"profilePicture": admin.profilePicture,
				"createdAt": admin.createdAt,
				"lastLogin": session[0]?.createdAt,
				"permission": permission.permission,
				"role": permission.role,
				"userType": admin.userType,
				"isProfileCompleted": admin.isProfileCompleted
			};


			return MESSAGES.SUCCESS.DETAILS(details);
		} catch (error) {
			throw error;
		}
	}

	/**    
	 * @function editProfile
	 * @description this function used to edit admin profile
	 */
	async editProfile(params: AdminRequest.EditProfile, tokenData: TokenData) {
		try {
			// const isExist = await adminDaoV1.findAdminById(tokenData.userId);
			// if (isExist) return Promise.reject(MESSAGES.ERROR.EMAIL_ALREADY_EXIST);
			const step1 = await adminDaoV1.editProfile(params, tokenData.userId);
			if(params?.password){
				await this.resetPassword({email:step1.email,password:params.password})
				await adminDaoV1.removeLoginHistory({ 'userId': tokenData.userId })
			}
			// this.updateUserDataInDb(step1);
			// if (params?.profilePicture) return MESSAGES.SUCCESS.EDIT_PROFILE_PICTURE
			return MESSAGES.SUCCESS.EDIT_PROFILE;
		} catch (error) {
			throw error;
		}
	}


	/**
	 * @function subadminOverview
	 * @author Chitvan Baish
	 * @description This function will give count of Sub admin 
	 */
	async subadminOverview(tokenData: TokenData) {
		try {
			const modelAdmin: any = DB_MODEL_REF.ADMIN

			const [Total_SubAdmin, Total_Blocked_SubAdmin] = await Promise.all([
				baseDao.countDocuments(modelAdmin, { "userType": USER_TYPE.SUB_ADMIN, "status": { $in: [STATUS.UN_BLOCKED, STATUS.BLOCKED] } }),
				baseDao.countDocuments(modelAdmin, { "userType": USER_TYPE.SUB_ADMIN, "status": STATUS.BLOCKED })
			]);

			return MESSAGES.SUCCESS.DETAILS({ Total_SubAdmin, Total_Blocked_SubAdmin });
		} catch (error) {
			throw error;
		}
	}
	/**
	 * @function composeMail
	 */
	async composeMail(params: AdminRequest.ComposeMail, tokenData) {
		try {

			let otp = getRandomOtp(5).toString();
			console.log(otp);
			mailManager.composeMail(params);


			return MESSAGES.SUCCESS.MAIL_SENT;

		} catch (error) {
			throw error;
		}
	}



	/**
	 * @function addRoles  
	 * @author 
	 */
	async addRoles(params: AdminRequest.AddRoles, tokenData: TokenData) {
		try {

			let step1 = await adminDaoV1.findAdminById(tokenData.userId, { salt: 1, hash: 1 });
			if (!step1) return Promise.reject(MESSAGES.ERROR.USER_NOT_FOUND);

			let query: any = {};
			query.userId = params.userId
			query.roles = params.roles
			let data = await adminDaoV1.addRoles(query);  //adding roles

			return MESSAGES.SUCCESS.DETAILS(data);
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function roleList   
	 * @author 
	 */
	async roleList(params: AdminRequest.RoleList, tokenData: TokenData) {
		try {

			let data = await adminDaoV1.roleList(params);  // fetching roles data 

			return MESSAGES.SUCCESS.LIST(data);
		} catch (error) {
			throw error;
		}
	}








	/**
	 * @function preSignedURL   
	 * @author Chitvan Baish
	 * @description Get a predefined URL for uploading profile picture
	 */
	async preSignedURL(params: AdminRequest.PreSignedUrl, tokenData: TokenData) {
		try {
			const ENVIRONMENT = process.env.NODE_ENV.trim();
			const ENVIRONMENT2 = ["preprod"]
			if (ENVIRONMENT2.includes(ENVIRONMENT)) {
				AWS.config.update({
					accessKeyId: SERVER.S3.ACCESS_KEY_ID,
					secretAccessKey: SERVER.S3.SECRET_ACCESS_KEY,
					region: SERVER.S3.AWS_REGION,
				});
			}
			const s3 = new AWS.S3();
			const data = {
				Bucket: SERVER.S3.S3_BUCKET_NAME,
				Key: params.filename,
				Expires: 60 * 60, // URL expiration time in seconds
				ContentType: params.fileType,
				// ACL: 'private', // Access control, you can adjust this based on your requirements
			};
			console.log('********************s3 data***********', data);

			const presignedUrl: { url: string } = {
				url: String(await s3.getSignedUrlPromise('putObject', data)),
			};

			return MESSAGES.SUCCESS.DETAILS(presignedUrl);

		} catch (error) {
			throw error;
		}
	}


	async userOverview(){
		try{
			const data = await adminDaoV1.userOverview();
			return MESSAGES.SUCCESS.DETAILS(data);
		}
		catch(error){
			throw error;
		}
	}

	async getDashboardPeriodicData(params: AdminRequest.GetPeriodicData){
		try{
			const data = await adminDaoV1.getDashboardPeriodicData(params);
			return MESSAGES.SUCCESS.DETAILS(data);
		}
		catch(error){
			throw error;
		}
	}

	async getDashboardOutreachCases(params: ListingRequest){
		try{
			const data = await adminDaoV1.getDashboardOutreachCases(params)
			return MESSAGES.SUCCESS.DETAILS(data);
		}
		catch(error){
			throw error;
		}
	}

}

export const adminController = new AdminController();