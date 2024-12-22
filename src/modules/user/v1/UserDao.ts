"use strict";

import * as _ from "lodash";

import { BaseDao } from "@modules/baseDao/BaseDao";
import { STATUS, DB_MODEL_REF, MESSAGES } from "@config/constant";
import { Search } from "@modules/admin/searchMapper";

import {createObjectCsvWriter} from "csv-writer"
import { imageUtil } from "@lib/ImageUtil";
import { SERVER } from "@config/index";

export class UserDao extends BaseDao {

	private modelUser: any;
	constructor(){
		super();
		this.modelUser = DB_MODEL_REF.USER;
	}

	/**
	 * @function isEmailExists
	 */
	async isEmailExists(params, userId?: string) {
		try {
			const query: any = {};
			query.email = params.email;
			if (userId) query._id = { "$not": { "$eq": userId } };
			query.status = { "$ne": STATUS.DELETED };

			const projection = { updatedAt: 0 };

			return await this.findOne(this.modelUser, query, projection);
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function isMobileExists
	 */
	async isMobileExists(params, userId?: string) {
		try {
			const query: any = {};
			query.countryCode = params.countryCode;
			query.mobileNo = params.mobileNo;
			if (userId) query._id = { "$not": { "$eq": userId } };
			query.status = { "$ne": STATUS.DELETED };

			const projection = { _id: 1, fullMobileNo:1, isMobileVerified: 1 };

			return await this.findOne(this.modelUser, query, projection);
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function signUp
	 */
	async signUp(params: UserRequest.SignUp, session?) {
		try {
			return await this.save(this.modelUser, params, { session });
		} catch (error) {
			throw error;
		}
	}

	/**    
	 * @function findUserById
	 */
	async findUserById(userId: string, project = {}) {
		try {
			const query: any = {};
			query._id = userId;
			query.status = { "$ne": STATUS.DELETED };

			const projection = (Object.values(project).length) ? project : { createdAt: 0, updatedAt: 0 };

			return await this.findOne(this.modelUser, query, projection);
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function changePassword   
	 */
	async changePassword(params: UserRequest.ChangeForgotPassword) {
		try {
			const query: any = {};
			query.email = params.email;

			const update = {};
			update["$set"] = {
				hash: params.hash
			};

			return await this.updateOne(this.modelUser, query, update, {});
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function userList
	 */
	async userList(params: AdminRequest.UserListing,tokenData: TokenData) {
		try {
			const aggPipe = [];

			let modelUser:any = DB_MODEL_REF.USER;

			const match: any = {};
			if (params.userType) match.userType = params.userType;
			if (params.searchKey) {
				aggPipe.push(Search(params.searchKey, ["name","email"]))
			}
			match.name = { $exists: true };
			if (params.status)
				match.status = { "$in": params.status };
			else
				match.status = { "$in": [STATUS.BLOCKED, STATUS.UN_BLOCKED] };
			if (params.fromDate && !params.toDate) match.created = { "$gte": params.fromDate };
			if (params.toDate && !params.fromDate) match.created = { "$lte": params.toDate };
			if (params.fromDate && params.toDate) match.created = { "$gte": params.fromDate, "$lte": params.toDate };
			// if (params.latestUsers) match.createdAt = { "$gte": new Date(new Date().setHours(0, 0, 0, 0)), "$lt": new Date(new Date().setHours(23, 59, 59, 999)) };
			aggPipe.push({ "$match": match });

			let sort = {};
			(params.sortBy && params.sortOrder) ? sort = { [params.sortBy]: params.sortOrder } : sort = { created: -1 };
			aggPipe.push({ "$sort": sort });
			// if(!params.isExport){

				if (params.limit && params.pageNo) {
					const [skipStage, limitStage] = this.addSkipLimit(
						params.limit,
						params.pageNo,
					);
					aggPipe.push(skipStage, limitStage);
				}
			// }

			const options = { collation: true };
			aggPipe.push({
				"$lookup": {
					from: DB_MODEL_REF.ROLE, 
					let: { roleId: "$roleId" },
					pipeline: [
						{
							$match: {
								$expr: { $eq: ["$_id", "$$roleId"] }
							}
							
						},
						{
							$project: {
								role:1
							}
						}
					],
					as: "role_detail"
				}
			},
			{
				$unwind: "$role_detail", // Unwind the user_detail array
			})
			aggPipe.push({
				"$project": {
					_id: 1,  name: 1, email: 1, status: 1,	created: 1,createdAt:1, roleId:1,role:"$role_detail.role"
				}
			});

			let pageCount = true;
			// if (params.latestUsers) pageCount = false;
			// if(!params.isExport){

			return await this.dataPaginate(modelUser, aggPipe, params.limit, params.pageNo, options, pageCount);
			// }else{
				// const result = await this.aggregate(modelUser,aggPipe)

				// const data: { url: string } = {
				// 	url: String(await this.exportToCSV(result, `${tokenData.userId}__UserListing.csv`)),
				//   };
				  
				// return MESSAGES.SUCCESS.DETAILS(data);
				
			// }
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function blockUnblock
	 */
	async blockUnblock(params: BlockRequest) {
		try {
			const query: any = {};
			query._id = params.userId;

			const update = {};
			update["$set"] = {
				status: params.status,
			};
			const options = { new: true };

			return await this.findOneAndUpdate(this.modelUser, query, update, options);
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function verifyUser
	 */
	async verifyUser(params: UserRequest.VerifyUser) {
		try {
			const query: any = {};
			query._id = params.userId;

			const update = {};
			update["$set"] = params;
			const options = { new: true };

			return await this.findOneAndUpdate(this.modelUser, query, update, options);
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function editProfile
	 */
	async editProfile(params, userId: string, profileSteps?: string[]) {
		try {
			const query: any = {};
			query._id = userId;

			const update = {};
			if (Object.values(params).length) update["$set"] = params;
			const options = { new: true };

			return await this.findOneAndUpdate(this.modelUser, query, update, options);
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function exportToCSV
	 * @description This function export the data into csv file
	 */
	async exportToCSV(data: any[], fileName: string) {
		const csvWriter = createObjectCsvWriter({
			path: `${SERVER.UPLOAD_DIR}` + fileName,
			header: [
				{ id: '_id', title: '_id' },
				{ id: 'name', title: 'name' },
				{ id: 'fullMobileNo', title: 'fullMobileNo' },
				{ id: 'createdAt', title: 'createdAt' },
				{ id: 'language', title: 'language' },
				{ id: 'status', title: 'status' },
				{ id: 'isMigratedUser', title: 'isMigratedUser'}
			],
		});

	
		try {
			await csvWriter.writeRecords(data);
			return await imageUtil.uploadSingleMediaToS3(fileName);
		} catch (error) {
			console.error('Error writing CSV:', error);
		}
	}
}

export const userDao = new UserDao();