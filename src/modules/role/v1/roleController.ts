"use strict";

import * as _ from "lodash";
import * as crypto from "crypto";


import { GEN_STATUS, MESSAGES, REDIS_PREFIX, REDIS_SUFFIX, SERVER, STATUS, USER_TYPE } from "@config/index";
import { adminDaoV1 } from "@modules/admin/index";
import { rolesDaoV1 } from "@modules/role/index";

import { MailManager } from "@lib/MailManager";
import { encryptHashPassword, passwordGenrator } from "@utils/appUtils";
import { loginHistoryDao } from "@modules/loginHistory";
import { redisClient } from "@lib/redis/RedisClient";
const mailManager = new MailManager();

export class RoleController {

	/**
	 * @function createRole
	 * @description This function is used to create the role
	 */
	async createRole(params: RoleRequest.CreateRole, tokenData: TokenData) {
		try {
			if (tokenData.userType === USER_TYPE.ADMIN ) {
				let role = await rolesDaoV1.isRoleExist(params.role);
				if (role) {
					return Promise.reject(MESSAGES.ERROR.ROLE_ALREADY_EXIST);
				}
				let step1 = await rolesDaoV1.createRole(params);
				return MESSAGES.SUCCESS.ROLE_CREATED(step1);
			} else {
				return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			}
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function editRole
	 * @description this function is used to edit the role
	 */
	async editRole(params: RoleRequest.EditRole, tokenData: TokenData) {
		try {
			if (tokenData.userType === USER_TYPE.ADMIN) {
				if (params.role) {
					let role = await rolesDaoV1.isRoleExist(params.role);
					if (role && params.roleId.toString() !== role._id.toString()) {
						return Promise.reject(MESSAGES.ERROR.ROLE_ALREADY_EXIST);
					}
				}
				let step1 = await rolesDaoV1.editRole(params);
				return MESSAGES.SUCCESS.ROLE_EDITED(step1);
			} else {
				return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			}
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function blockRole
	 * @description this function is used to block the role
	 */
	async blockRole(params: RoleRequest.BlockUnblockRole, tokenData: TokenData) {
		try {
			if (tokenData.userType === USER_TYPE.ADMIN) {
				let step1 = await rolesDaoV1.blockRole(params);
				if (params.status === STATUS.BLOCKED) {
					let step2 = await rolesDaoV1.blockRoleSubadmin(params);
				}
				switch (params.status) {
					case STATUS.BLOCKED:
						return MESSAGES.SUCCESS.ROLE_BLOCKED;
					case STATUS.UN_BLOCKED:
						return MESSAGES.SUCCESS.ROLE_UNBLOCKED;
				};
			} else {
				return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			}
		} catch (error) {
			throw (error);
		}
	}
	/**
	 * @function deleteRole
	 * @description This function is used to delete the role
	 */
	async deleteRole(params: RoleRequest.RoleId, tokenData: TokenData) {
		try {
			if (tokenData.userType === USER_TYPE.ADMIN) {
				let step1 = await rolesDaoV1.deleteRole(params);
				let step2 = await rolesDaoV1.deleteRoleSubadmin(params);
				return MESSAGES.SUCCESS.ROLE_DELETED;
			} else {
				return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			}
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function roleList
	 * @description Get the list of roles
	 */
	async roleList(params: ListingRequest, tokenData: TokenData) {
		try {
			let step1 = await rolesDaoV1.roleList(params);
			return MESSAGES.SUCCESS.ROLE_LIST(step1);
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function roleDetails
	 * @description Get the details of a role
	 */
	async roleDetails(params: RoleRequest.RoleId, tokenData: TokenData) {
		try {
			if (tokenData.userType === USER_TYPE.ADMIN) {
				let step1 = await rolesDaoV1.roleDetails(params);
				return MESSAGES.SUCCESS.ROLE_DETAILS(step1);
			} else {
				return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			}
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function createSubAdmin
	 * @description this function is used to create the sub-admin
	 */
	async createSubAdmin(params: RoleRequest.CreateSubAdmin, tokenData: TokenData) {
		try {
			if (tokenData.userType === USER_TYPE.ADMIN || tokenData.userType === USER_TYPE.SUB_ADMIN) {
				let step1 = await adminDaoV1.isEmailExists(params);
				if (step1) {
					return Promise.reject(MESSAGES.ERROR.EMAIL_ALREADY_EXIST);
				}
				let step2 = await rolesDaoV1.findRoleById(params.roleId);
				if (!step2) {
					return Promise.reject(MESSAGES.ERROR.INVALID_ROLE_ID);
				}
				let password = passwordGenrator(12);
				params.salt = crypto.randomBytes(64).toString("hex");
				params.hash = encryptHashPassword(password, params.salt);;
				let step3 = await rolesDaoV1.createSubAdmin({
					name: params.name,
					email: params.email,
					roleId: params.roleId,
					userType: USER_TYPE.SUB_ADMIN,
					hash: params.hash,
					salt: params.salt,
					addedBy: tokenData.userId,
				});
				let link = `${SERVER.ADMIN_URL}/dashboard`;

				await mailManager.subAdminPasswordMail({ "email": params.email, "password": password, "role": step2.role, "link": link, "admin_url":SERVER.ADMIN_URL });
				// const SubAdminStatusPayload = {
				// 	jobName: JOB_SCHEDULER_TYPE.SUB_ADMIN_REINVITE,
				// 	time: SERVER.TOKEN_INFO.EXPIRATION_TIME.SUB_ADMIN_REINVITE,
				// 	data: { "email": params.email, "id":step3._id }
				// };

				// redisClient.createJobs(SubAdminStatusPayload);

				redisClient.setExp(
					`${REDIS_PREFIX.NAME}.${SERVER.ENVIRONMENT}.${params.email}.${REDIS_SUFFIX.INVITE}`,
					SERVER.TOKEN_INFO.EXPIRATION_TIME.SUB_ADMIN_REINVITE / 1000,
					JSON.stringify({ email: params.email})
				);	

				return MESSAGES.SUCCESS.SUB_ADMIN_CREATED;
			} else {
				return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			}
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function editSubAdmin
	 * @description This function is used to edit the sub-admin
	 */
	async editSubAdmin(params: RoleRequest.EditSubAdmin, tokenData: TokenData) {
		try {
			if (tokenData.userType === USER_TYPE.ADMIN || tokenData.userType === USER_TYPE.SUB_ADMIN) {
				let role : string = '';
				let step1 = await rolesDaoV1.findSubAdminById({ "userId": params.adminId });
				if (!step1) {
					return Promise.reject(MESSAGES.ERROR.INVALID_SUB_ADMIN);
				}
				if (params.roleId) {
					let step3 = await rolesDaoV1.findRoleById(params.roleId);
					role = step3.role;
					if (!step3) {
						return Promise.reject(MESSAGES.ERROR.INVALID_ROLE_ID);
					}
				}
				let step4 = await rolesDaoV1.editSubAdmin(params);
				return MESSAGES.SUCCESS.SUB_ADMIN_EDITED;
			} else {
				return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			}
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function blockUnblockSubAdmin
	 * @description This function block and unblock the sub-admin
	 */
	async blockUnblockSubAdmin(params: RoleRequest.BlockSubAdmin, tokenData: TokenData) {
		try {
			if((params.adminId).toString() == (tokenData.userId).toString()){
				return Promise.reject(MESSAGES.ERROR.SELF_BLOCK)
			}
			if (tokenData.userType === USER_TYPE.ADMIN || tokenData.userType === USER_TYPE.SUB_ADMIN) {
				//if (params.status === STATUS.UN_BLOCKED) {
				let subadmin = await rolesDaoV1.findSubAdminById({ "userId": params.adminId });
				if (!subadmin) {
					return Promise.reject(MESSAGES.ERROR.INVALID_SUB_ADMIN);
				}
				if (subadmin.roleId) {
					let role = await rolesDaoV1.findRoleById(subadmin.roleId);
					if (!role || role.status === STATUS.BLOCKED) {
						return Promise.reject(MESSAGES.ERROR.ROLE_IS_BLOCKED);
					}
				}
				if(subadmin.status == GEN_STATUS.PENDING && params.status == STATUS.UN_BLOCKED){
					params.status = GEN_STATUS.PENDING 
				} 
				if(subadmin.status == STATUS.BLOCKED && subadmin.isProfileCompleted == false && params.status == STATUS.UN_BLOCKED){
					params.status = GEN_STATUS.PENDING 
				}
				//}
				let step1 = await rolesDaoV1.blockUnblockSubAdmin(params);
				switch (params.status) {
					case STATUS.BLOCKED:
						await loginHistoryDao.removeDeviceById({ "userId": params.adminId });
						return MESSAGES.SUCCESS.SUB_ADMIN_BLOCKED;
					case STATUS.UN_BLOCKED:
						return MESSAGES.SUCCESS.SUB_ADMIN_UNBLOCKED;
				};
			} else {
				return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			}
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function deleteSubAdmin
	 * @description Delete the sub-admin profile
	 */
	async deleteSubAdmin(params: RoleRequest.AdminId, tokenData: TokenData) {
		try {
			if (tokenData.userType === USER_TYPE.ADMIN || tokenData.userType === USER_TYPE.SUB_ADMIN) {
				let step1 = await rolesDaoV1.deleteSubAdmin(params);
				await loginHistoryDao.removeDeviceById({ "userId": params.adminId });
				return MESSAGES.SUCCESS.SUB_ADMIN_DELETED;
			} else {
				return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			}
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function subAdminList
	 * @description get the listing of sub-admins
	 */
	async subAdminList(params: RoleRequest.SubAdminList, tokenData: TokenData) {
		try {
			if (tokenData.userType === USER_TYPE.ADMIN || tokenData.userType === USER_TYPE.SUB_ADMIN) {
				let step1 = await rolesDaoV1.subAdminList(params,tokenData);
				if (params.isExport) {
					return MESSAGES.SUCCESS.DOWNLOAD_FILE
				}
				else {
					return MESSAGES.SUCCESS.SUB_ADMIN_LIST(step1)
				}
			} else {
				return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			}
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function subAdminDetails
	 * @description Get the details of subadmin
	 */
	async subAdminDetails(params: RoleRequest.AdminId, tokenData: TokenData) {
		try {
			if (tokenData.userType === USER_TYPE.ADMIN || tokenData.userType === USER_TYPE.SUB_ADMIN) {
				let step1 = await rolesDaoV1.subAdminDetails(params);
				if (step1?.roleId) {
					let step2 = await rolesDaoV1.findRoleById(step1.roleId);
					if (step2) {
						step1.role = step2.role;
						step1.permission = step2.permission;
					}
				}
				return MESSAGES.SUCCESS.SUB_ADMIN_DETAILS(step1);
			} else {
				return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			}
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function getroleList
	 * @description Get the listing of roles
	 */
	async getroleList(tokenData: TokenData) {
		try {
			const roleList = await rolesDaoV1.getRoleList(tokenData);
			return MESSAGES.SUCCESS.DETAILS(roleList);
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function resendInviteSubadmin
	 * @description this function is used to send reinvite mail
	 */
	async resendInviteSubadmin(params: RoleRequest.resendInviteSubadmin, tokenData: TokenData) {
		try {
			if (tokenData.userType === USER_TYPE.ADMIN || tokenData.userType === USER_TYPE.SUB_ADMIN) {
				let step1 = await adminDaoV1.isEmailExistsWithStatus(params);
				if (!step1) {
					return Promise.reject(MESSAGES.ERROR.INVALID_SUB_ADMIN);
				}
				// if(!step1?.reinvite){
				// 	return Promise.reject(MESSAGES.ERROR.REINVITE_NOT_VALID)
				// }
				let reinvite = await redisClient.getValue(`${REDIS_PREFIX.NAME}.${SERVER.ENVIRONMENT}.${step1.email}.${REDIS_SUFFIX.INVITE}`)
				if(reinvite){
					return Promise.reject(MESSAGES.ERROR.REINVITE_NOT_VALID);
				}
				let step2 = await rolesDaoV1.findRoleById(step1.roleId);
				if (!step2) {
					return Promise.reject(MESSAGES.ERROR.INVALID_ROLE_ID);
				}
				
				let password = passwordGenrator(12);
				let salt = crypto.randomBytes(64).toString("hex");
				let hash = encryptHashPassword(password, salt);;
				let step3 = await rolesDaoV1.editSubAdmin({
					adminId:params.adminId,
					hash: hash,
					salt: salt,
				});
				let link = `${SERVER.ADMIN_URL}/dashboard`;

				await mailManager.subAdminPasswordMail({ "email": step1.email, "password": password, "role": step2.role, "link": link, "admin_url":SERVER.ADMIN_URL });

				return MESSAGES.SUCCESS.RESEND_REINVITE;
			} else {
				return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			}
		} catch (error) {
			throw (error);
		}
	}
	

	/**
	 * @function adminSubAdminList
	 * @description get the listing of sub-admins
	 */
	async adminSubAdminList(params: RoleRequest.SubAdminList, tokenData: TokenData) {
		try {
			if (tokenData.userType === USER_TYPE.ADMIN || tokenData.userType === USER_TYPE.SUB_ADMIN) {
				let step1 = await rolesDaoV1.adminSubAdminList(params);
				return MESSAGES.SUCCESS.SUB_ADMIN_LIST(step1);
			} else {
				return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
			}
		} catch (error) {
			throw (error);
		}
	}

}

export let roleController = new RoleController();