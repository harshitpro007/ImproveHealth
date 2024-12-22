"use strict";

import * as _ from "lodash";
import { BaseDao } from "@modules/baseDao/BaseDao";

import { DB_MODEL_REF, GEN_STATUS, STATUS, USER_TYPE } from "@config/index";
import * as mongoose from "mongoose";
import { Search } from "@modules/admin/searchMapper";
import { genRandomString, toObjectId } from "@utils/appUtils";
import { eligibiltyCheckDaoV1 } from "@modules/eligibilityCheck";
import { mailManager } from "@lib/MailManager";
const crypto = require("crypto");
export class RoleDao extends BaseDao {

	private modelRole: any;
	private modelAdmin: any;
	constructor() {
		super();
		this.modelRole = DB_MODEL_REF.ROLE;
		this.modelAdmin = DB_MODEL_REF.ADMIN;
	}

	/**
	 * @function createRole
	 */
	async createRole(params: RoleRequest.CreateRole) {
		try {
			return await this.save(this.modelRole, params);
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function isRoleExist
	 */
	async isRoleExist(role: string) {
		try {
			const query: any = {};
			query.status = { "$in": [STATUS.UN_BLOCKED, STATUS.BLOCKED] };
			query.role = { "$regex": new RegExp("^" + role + "$", "i") };
			const projection = { updatedAt: 0 };
			const options: any = { lean: true };

			return await this.findOne(this.modelRole, query, projection, options);
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function editRole
	 */
	async editRole(params: RoleRequest.EditRole) {
		try {
			const query: any = {};
			query._id = new mongoose.Types.ObjectId(params.roleId);
			const update = {};
			update["$set"] = params;
			const options: any = { new: true };
			return await this.findOneAndUpdate(this.modelRole, query, update, options);
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function blockRole
	 */
	async blockRole(params: RoleRequest.BlockUnblockRole) {
		try {
			const query: any = {};
			query._id = new mongoose.Types.ObjectId(params.roleId);
			query.status = { "$ne": STATUS.DELETED };
			const update = {};
			update["$set"] = {
				status: params.status
			};
			const options: any = {};
			return await this.updateOne(this.modelRole, query, update, options);
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function blockRoleSubadmin
	 */
	async blockRoleSubadmin(params: RoleRequest.BlockUnblockRole) {
		try {
			const query: any = {};
			query.roleId = new mongoose.Types.ObjectId(params.roleId);
			query.status = { "$in": [STATUS.BLOCKED, STATUS.UN_BLOCKED] };
			const update = {};
			update["$set"] = {
				status: params.status
			};
			const options: any = { multi: true, runValidators: true };
			return await this.updateMany(this.modelAdmin, query, update, options);
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function deleteRole
	 */
	async deleteRole(params: RoleRequest.RoleId) {
		try {
			const query: any = {};
			query._id = new mongoose.Types.ObjectId(params.roleId);
			query.status = { "$in": [STATUS.BLOCKED, STATUS.UN_BLOCKED] };
			const update = {};
			update["$set"] = {
				status: STATUS.DELETED
			};
			const options: any = {};
			return await this.updateOne(this.modelRole, query, update, options);
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function deleteRoleSubadmin
	 */
	async deleteRoleSubadmin(params: RoleRequest.RoleId) {
		try {
			const query: any = {};
			query.roleId = new mongoose.Types.ObjectId(params.roleId);
			query.status = { "$ne": STATUS.DELETED };
			const update = {};
			update["$set"] = {
				status: STATUS.DELETED
			};
			const options: any = { multi: true, runValidators: true };
			return await this.updateMany(this.modelAdmin, query, update, options);
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function roleList
	 */
	async roleList(params: ListingRequest) {
		try {
			let { pageNo, limit, searchKey, sortBy, sortOrder, status, fromDate, toDate } = params;
			const aggPipe = [];

			const match: any = {};
			match.status = { "$in": [STATUS.BLOCKED, STATUS.UN_BLOCKED] };
			// if (status) {
			// 	match.status = { "$in": status };
			// }
			// if (params.fromDate && !params.toDate) match.created = { "$gte": params.fromDate };
			// if (params.toDate && !params.fromDate) match.created = { "$lte": params.toDate };
			// if (params.fromDate && params.toDate) match.created = { "$gte": params.fromDate, "$lte": params.toDate };
			if (searchKey) {
				aggPipe.push(Search(params.searchKey, ["role"]))


			}
			aggPipe.push({ "$match": match });

			let sort: any = {};
			(sortBy && sortOrder) ? sort = { [sortBy]: sortOrder } : sort = { "createdAt": -1 };
			aggPipe.push({ "$sort": sort });

			if (params.limit && params.pageNo) {
				const [skipStage, limitStage] = this.addSkipLimit(
					params.limit,
					params.pageNo,
				);
				aggPipe.push(skipStage, limitStage);
			}

			let project: any = {
				_id: 1,
				role: 1,
				permission: 1,
				status: 1,
				// createdAt: 1,
				// updatedAt: 1,
				roleUniqueId:1,
				created: 1
			};
			aggPipe.push({ "$project": project });

			return await this.dataPaginate(this.modelRole, aggPipe, limit, pageNo, {}, true);
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function roleDetails
	 */
	async roleDetails(params: RoleRequest.RoleId) {
		try {
			const query: any = {};
			query._id = new mongoose.Types.ObjectId(params.roleId);

			const projection = { updatedAt: 0 };
			const options: any = { lean: true };

			return await this.findOne(this.modelRole, query, projection, options);
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function findRoleById
	 */
	async findRoleById(roleId: string) {
		try {
			const query: any = {};
			query._id = new mongoose.Types.ObjectId(roleId);
			query.status = { "$in": [STATUS.UN_BLOCKED, STATUS.BLOCKED] };
			const projection = { updatedAt: 0 };
			const options: any = { lean: true };

			return await this.findOne(this.modelRole, query, projection, options);
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function createSubAdmin
	 */
	async createSubAdmin(params: RoleRequest.CreateSubAdmin) {
		try {
			return await this.save(this.modelAdmin, params);
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function editSubAdmin
	 * @author shivam singhal
	 */
	async editSubAdmin(params: RoleRequest.EditSubAdmin) {
		try {
			const query: any = { _id: new mongoose.Types.ObjectId(params.adminId) };
			const update: any = { "$set": params };
			const options = {};
			await this.updateOne(this.modelAdmin, query, update, options);
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function blockUnblockSubAdmin
	 */
	async blockUnblockSubAdmin(params: RoleRequest.BlockSubAdmin) {
		try {
			const query: any = {};
			query._id = new mongoose.Types.ObjectId(params.adminId);
			query.status = { "$ne": STATUS.DELETED };
			const update = {};
			update["$set"] = {
				status: params.status
			};
			const options: any = {};
			return await this.updateOne(this.modelAdmin, query, update, options);
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function deleteSubAdmin
	 */
	async deleteSubAdmin(params: RoleRequest.AdminId) {
		try {
			const query: any = {};
			query._id = new mongoose.Types.ObjectId(params.adminId);
			const update = {};
			update["$set"] = {
				status: STATUS.DELETED
			};
			const options: any = {};
			return await this.updateOne(this.modelAdmin, query, update, options);
		} catch (error) {
			throw (error);
		}
	}

	/**
	 * @function subAdminList
	 */
	async subAdminList(params: RoleRequest.SubAdminList,tokenData: TokenData) {
		try {
			let { pageNo, limit, searchKey, sortBy, sortOrder, status, fromDate, toDate, roleId } = params;
			const aggPipe = [];

			const match: any = {};
			match.userType = { "$ne": USER_TYPE.ADMIN };
			// match._id = {"$ne": toObjectId(tokenData.userId)}
			match.status = { "$ne": STATUS.DELETED };
			if (status) {
				match.status = { "$in": status };
			}
			if (params.fromDate && !params.toDate) match.created = { "$gte": params.fromDate };
			if (params.toDate && !params.fromDate) match.created = { "$lte": params.toDate };
			if (params.fromDate && params.toDate) match.created = { "$gte": params.fromDate, "$lte": params.toDate };
			if (roleId) {
				match.roleId = {
					$in: roleId.map(id => toObjectId(id))
				}
			}			
			if (searchKey) {
				match.email= { "$regex": new RegExp(searchKey, "i") } 
			}

			aggPipe.push({ "$match": match });

			let sort: any = {};
			(sortBy && sortOrder) ? sort = { [sortBy]: sortOrder } : sort = { "created": -1 };
			aggPipe.push({ "$sort": sort });

			if(!params.isExport){

				if (params.limit && params.pageNo) {
					const [skipStage, limitStage] = this.addSkipLimit(
						params.limit,
						params.pageNo,
					);
					aggPipe.push(skipStage, limitStage);
				}
			}

			const lookup: any = {
				from: this.modelRole,
				localField: "roleId",
				foreignField: "_id",
				as: "roleData"
			}
			const lookup1: any = {
				from: this.modelAdmin,
				localField: "addedBy",
				foreignField: "_id",
				as: "userDetails"
			}
			aggPipe.push({ "$lookup": lookup });
			aggPipe.push({ "$lookup": lookup1 });
			aggPipe.push({
				'$unwind': {
					"path": "$roleData",
					"preserveNullAndEmptyArrays": true
				}
			});
			aggPipe.push({
				"$unwind": {
					"path": "$userDetails",
				}
			});
			



			if(!params.isExport){
				let project: any = {
					_id: 1,
					name: 1,
					email: 1,
					status: 1,
					created: 1,
					roleId: 1,
					profilePicture: 1,
					role: "$roleData.role",
					addedBy: "$userDetails.name",
					createdAt:1
				};
				aggPipe.push({ "$project": project });
				return await this.dataPaginate(this.modelAdmin, aggPipe, limit, pageNo, {}, true);
			}else{
				let project: any = {
					name: 1,
					email: 1,
					roleId: 1,
					role: "$roleData.role",
					addedBy: "$userDetails.name",
					createdAt: {
						$dateToString: { format: "%m/%d/%Y", date: "$createdAt" }
					},					
					status: {
						$cond: {
							if: { $eq: ["$status", "UN_BLOCKED"] },
							then: "ACTIVE",
							else: "$status"
						}
					},
				};
				aggPipe.push({ "$project": project });
				const header = [
					{ id: 'name', title: 'Name' },
					{ id: 'email', title: 'Email' },
					{ id: 'status', title: 'Status' },
					{ id: 'role', title: 'Role' },
					{ id: 'createdAt', title: 'Added on' },
					{ id: 'addedBy', title: 'Added By'}
				]
				const data = {
					aggPipe:aggPipe,
					exportFileName: `userManagement_${genRandomString(6)}.csv`,
					header:header,
				}
				this.exportFiles(data,tokenData);

				// let date = Date.now();
				// const data: { url: string } = {
				// 	url: String(await eligibiltyCheckDaoV1.exportToCSV(result, `${tokenData.userId}_${date}__userManagement.csv`, header)),
				//   };
				
				return true;
			}
		} catch (error) {
			throw (error);
		}
	}

	async exportFiles(params,tokenData:TokenData){
        try {
            const model: any = DB_MODEL_REF.ADMIN
            const result = await this.aggregate(model, params.aggPipe)
           
            const data: { url: string } = {
                url: String(await eligibiltyCheckDaoV1.exportToCSV(result, params.exportFileName, params.header)),
            };
            await mailManager.exportCassesFileMail({link: data.url, email: tokenData?.email, name: tokenData?.name, caseType: "User_Management"})
        } catch (error) {
            throw error
        }
    }

	/**
	 * @function findSubAdminById
	 */
	async findSubAdminById(params: UserId) {
		try {
			const query: any = {};
			query._id = new mongoose.Types.ObjectId(params.userId);
			query.status = { "$in": [GEN_STATUS.UN_BLOCKED, GEN_STATUS.BLOCKED, GEN_STATUS.PENDING] };
			query.userType = { "$eq": USER_TYPE.SUB_ADMIN };

			const projection = { updatedAt: 0 };
			const options: any = { lean: true };

			return await this.findOne(this.modelAdmin, query, projection, options);
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function subAdminDetails
	 */
	async subAdminDetails(params: RoleRequest.AdminId) {
		try {
			const query: any = {};
			query._id = new mongoose.Types.ObjectId(params.adminId);
			query.userType = { "$eq": USER_TYPE.SUB_ADMIN };

			const projection = {
				_id: 1,
				name: 1,
				email: 1,
				status: 1,
				createdAt: 1,
				updatedAt: 1,
				roleId: 1,
				mobileNo:1,
				countryCode:1,
				fullMobileNo:1,
			};
			const options: any = { lean: true };

			return await this.findOne(this.modelAdmin, query, projection, options);
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function getRoleList
	 */
	async getRoleList(tokenData) {
		try {
			const match = {
				status: STATUS.UN_BLOCKED
			}
			const projection = {
				role: 1
			}
			return await this.find(this.modelRole, match, projection)
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function adminSubAdminList
	 */
	async adminSubAdminList(params: RoleRequest.SubAdminList) {
		try {
			let { pageNo, limit, searchKey, sortBy, sortOrder, status, fromDate, toDate, roleId } = params;
			const aggPipe = [];

			const match: any = {};
			match.status = { "$eq": STATUS.UN_BLOCKED };	
			if (searchKey) {
				match["$or"] = [
					{ name: { "$regex": new RegExp(searchKey, "i") }},
					{ email: { "$regex": new RegExp(searchKey, "i") }} 
				]
			}

			aggPipe.push({ "$match": match });

			let sort: any = {};
			sort = { "created": -1 };
			aggPipe.push({ "$sort": sort });


			if (params.limit && params.pageNo) {
				const [skipStage, limitStage] = this.addSkipLimit(
					params.limit,
					params.pageNo,
				);
				aggPipe.push(skipStage, limitStage);
			}
			

			let project: any = {
				_id: 1,
				name: 1,
				email: 1,
				status: 1,
				created: 1,
				profilePicture: 1,
				createdAt:1
			};
			aggPipe.push({ "$project": project });

			return await this.dataPaginate(this.modelAdmin, aggPipe, limit, pageNo, {}, true);
		} catch (error) {
			throw (error);
		}
	}

}

export let roleDao = new RoleDao();