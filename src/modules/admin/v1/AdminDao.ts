"use strict";

import { BaseDao } from "@modules/baseDao/BaseDao";

import { STATUS, DB_MODEL_REF, GEN_STATUS, USER_TYPE, DISPUTE_STATUS } from "@config/constant";
import { escapeSpecialCharacter, toObjectId } from "@utils/appUtils";
import { redisClient } from "@lib/redis/RedisClient";
import moment = require("moment");
import { dispSearch } from "../searchMapper";

export class AdminDao extends BaseDao {

	private modelAdmin: any;
	private modelRole: any;
	private modelActivities: any;
	private modelIdreCases: any;

	constructor() {
		super();
		this.modelAdmin = DB_MODEL_REF.ADMIN;
		this.modelRole = DB_MODEL_REF.ROLE;
		this.modelActivities = DB_MODEL_REF.ACTIVITIES;
		this.modelIdreCases = DB_MODEL_REF.IDRE_CASES
	}

	/**
	 * @function isEmailExists
	 */
	async isEmailExists(params, userId?: string) {
		try {
			const query: any = {};
			query.email = params.email;
			if (userId) query._id = { "$not": { "$eq": userId } };
			query.status = { "$in": [GEN_STATUS.UN_BLOCKED, GEN_STATUS.BLOCKED, GEN_STATUS.PENDING] };

			const projection = { updatedAt: 0, refreshToken: 0 };

			return await this.findOne(this.modelAdmin, query, projection);
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function findAdminById
	 */
	async findAdminById(userId: string, project = {}) {
		try {
			const query: any = {};
			query._id = userId;
			query.status = { "$in": [GEN_STATUS.UN_BLOCKED, GEN_STATUS.BLOCKED] };

			const projection = (Object.values(project).length) ? project : { createdAt: 0, updatedAt: 0 };

			return await this.findOne(this.modelAdmin, query, projection);
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function createAdmin
	 */
	async createAdmin(params: AdminRequest.Create) {
		try {
			return await this.save(this.modelAdmin, params);
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function emptyForgotToken
	 */
	async emptyForgotToken(params) {
		try {
			const query: any = {};
			if (params.token) query.forgotToken = params.token;
			if (params.userId) query._id = params.userId;

			const update = {};
			update["$unset"] = {
				"forgotToken": ""
			};

			return await this.updateOne(this.modelAdmin, query, update, {});
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function changePassword   
	 */
	async changePassword(params, userId?: string) {
		try {
			const query: any = {};
			if (userId) query._id = userId
			if (params.email) query.email = params.email;

			const update = {};
			update["$set"] = {
				"hash": params.hash
			};

			return await this.updateOne(this.modelAdmin, query, update, {});
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function editProfile
	 */
	async editProfile(params: AdminRequest.EditProfile, userId: string) {
		try {
			const query: any = {};
			query._id = userId;

			const update = {};
			update["$set"] = { ...params, isProfileCompleted: true };
			const options = { new: true };

			return await this.findOneAndUpdate(this.modelAdmin, query, update, options);
		} catch (error) {
			throw error;
		}
	}


	/**
	  * @function timeSheetHistory
	  * @description 
	  */
	async timeSheetHistory(params: UserRequest.TimeSHeetHistory, tokenData) {
		try {
			const aggPipe = [];
			const match: any = {};
			aggPipe.push({ "$unwind": "$attendees" });
			match['attendees._id'] = toObjectId(params.userId)
			match['attendees.status'] = { "$ne": STATUS.CANCELLED.TYPE }
			if (params.type == STATUS.ONGOING) {
				match['status'] = STATUS.ONGOING

			}
			if (params.type == STATUS.UPCOMING) {
				match['status'] = STATUS.PENDING.TYPE

			}
			aggPipe.push({ "$match": match });
			aggPipe.push({ "$sort": { createdAt: -1 } });

			aggPipe.push({
				"$project": {

					activityType: 1,
					attendees: 1,
					startTime: 1,
					shiftEndTime: 1,
					endTime: 1,
					createdAt: 1

				}
			});


			const response: any = await this.paginate(this.modelActivities, aggPipe, params.limit, params.pageNo, {});
			let counData = await this.aggregate(this.modelActivities, aggPipe, {});

			response.total = counData.length;


			return response;
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function addRoles
	 */
	async addRoles(params) {
		try {
			return await this.save(this.modelRole, params);
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function roleList
	 */
	async roleList(params: AdminRequest.RoleList) {
		try {
			const aggPipe = [];

			const match: any = {};
			match['userId'] = params.userId
			if (params.status) {
				match.status = { "$eq": params.status };
			} else match.status = { "$ne": STATUS.DELETED };

			if (params.searchKey) {
				params.searchKey = escapeSpecialCharacter(params.searchKey);
				match.roles = { "$regex": params.searchKey, "$options": "-i" };
			}

			if (params.fromDate && !params.toDate) match.created = { "$gte": params.fromDate };
			if (params.toDate && !params.fromDate) match.created = { "$lte": params.toDate };
			if (params.fromDate && params.toDate) match.created = { "$gte": params.fromDate, "$lte": params.toDate };

			aggPipe.push({ "$match": match });

			let sort = {};
			(params.sortBy && params.sortOrder) ? sort = { [params.sortBy]: params.sortOrder } : sort = { created: -1 };
			aggPipe.push({ "$sort": sort });

			if (params.limit && params.pageNo) {
				const [skipStage, limitStage] = this.addSkipLimit(
					params.limit,
					params.pageNo,
				);
				aggPipe.push(skipStage, limitStage);
			}

			const options = { collation: true };

			let response = await this.dataPaginate(this.modelRole, aggPipe, params.limit, params.pageNo, options, false);
			return response;
		} catch (error) {
			throw error;
		}
	}

	async addForgotToken(params) {
		let query: any = {};
		const update = {};
		let options: any = {};
		let model: any = DB_MODEL_REF.ADMIN;
		query._id = params.userId
		query.status = STATUS.UN_BLOCKED,


			update["$set"] = { "forgotToken": params.forgotToken };

		return await this.updateOne(model, query, update, options);
	}


	/**
	 * @function updateStatus
	 */
	async updateStatus(params) {
		try {
			const query = {
				_id: params.userId,
			}
			const update = {
				status: STATUS.UN_BLOCKED,
				reinvite: false
			}
			return await this.updateMany(this.modelAdmin, query, update, {});
		} catch (error) {
			throw error;
		}
	}




	async removeLoginHistory(params) {
		try {
			let model: any = DB_MODEL_REF.LOGIN_HISTORY;
			const query = {
				"userId._id": toObjectId(params.userId),
				isLogin: true
			}
			const update: any = {};
			update['$set'] = { isLogin: false }
			const loginData = await this.find(model, query, { deviceId: 1 })
			await this.updateMany(model, query, update, {})

			console.log('******************', (Array.isArray(loginData)), (loginData.length > 0), '***********loginData**************', loginData)
			// Check if loginData is an array and has at least one item
			if (Array.isArray(loginData) && loginData.length > 0) {
				const firstLoginItem = loginData[0];
				await redisClient.deleteKey(`${params.userId}.${firstLoginItem.deviceId}`)
			} else {
				console.log('No login data found for the specified user.');
			}

		} catch (error) {
			throw error;
		}
	}

	/**
	 * @function isEmailExistsWithStatus
	 */
	async isEmailExistsWithStatus(params, userId?: string) {
		try {
			const query: any = {};
			query._id = toObjectId(params.adminId);
			query.status = { "$eq": GEN_STATUS.PENDING };

			const projection = { updatedAt: 0, refreshToken: 0 };

			return await this.findOne(this.modelAdmin, query, projection);
		} catch (error) {
			throw error;
		}
	}


	async isAdminExist(adminId) {
		try {
			return await this.findOne(this.modelAdmin, { _id: toObjectId(adminId), status: STATUS.UN_BLOCKED }, { _id: 1 })
		} catch (error) {
			throw error
		}
	}

	async userOverview() {
		try {
			const [totalIDR, eligibleIDR, ineligibleIDR, outreachIDR, otherIDR] = await Promise.all([
				this.countDocuments(this.modelIdreCases, {}),
				this.countDocuments(this.modelIdreCases, { status: DISPUTE_STATUS.ELIGIBLE }),
				this.countDocuments(this.modelIdreCases, { status: DISPUTE_STATUS.NOT_ELIGIBLE }),
				this.countDocuments(this.modelIdreCases, { status: DISPUTE_STATUS.OUTREACH }),
				this.countDocuments(this.modelIdreCases, { status: { $in: [DISPUTE_STATUS.OPEN, DISPUTE_STATUS.IN_PROGRESS, DISPUTE_STATUS.RE_CHECK, DISPUTE_STATUS.NOT_VERIFIED, DISPUTE_STATUS.CLOSED, DISPUTE_STATUS.IN_COMPLETE, DISPUTE_STATUS.COI_EXISTS] } }),
			])

			return { totalIDR, eligibleIDR, ineligibleIDR, outreachIDR, otherIDR };
		}
		catch (error) {
			throw error;
		}
	}

	async getDashboardPeriodicData(params: AdminRequest.GetPeriodicData) {
		try {
			const { fromDate } = params;
			const startOfYear = moment(fromDate).startOf('year');

			const monthQueries = [];
			for (let month = 0; month < 12; month++) {
				const startOfMonth = moment(startOfYear).add(month, 'months').startOf('month').valueOf();
				const endOfMonth = moment(startOfYear).add(month, 'months').endOf('month').valueOf();

				monthQueries.push({
					startOfMonth,
					endOfMonth,
					monthName: moment(startOfMonth).format('MMMM')
				});
			}

			const monthlyResults = await Promise.all(monthQueries.map(({ startOfMonth, endOfMonth, monthName }) => {
				return this.aggregate(this.modelIdreCases, [
					{
						$match: {
							created: { $gte: startOfMonth, $lte: endOfMonth }
						}
					},
					{
						$group: {
							_id: {
								$cond: {
									if: { $in: ["$status", [DISPUTE_STATUS.ELIGIBLE, DISPUTE_STATUS.OUTREACH, DISPUTE_STATUS.NOT_ELIGIBLE]] },
									then: "$status",
									else: DISPUTE_STATUS.OTHER
								}
							},
							count: { $sum: 1 }
						}
					}
				]).then(monthData => {
					const finalMonthData = [
						{ _id: DISPUTE_STATUS.ELIGIBLE, count: 0 },
						{ _id: DISPUTE_STATUS.OUTREACH, count: 0 },
						{ _id: DISPUTE_STATUS.NOT_ELIGIBLE, count: 0 },
						{ _id: DISPUTE_STATUS.OTHER, count: 0 }
					];

					monthData.forEach(item => {
						const statusIndex = finalMonthData.findIndex(status => status._id === item._id);
						if (statusIndex !== -1) {
							finalMonthData[statusIndex].count = item.count;
						}
					});

					return {
						month: monthName,
						data: finalMonthData
					};
				});
			}));

			return monthlyResults;
		}
		catch (error) {
			throw error;
		}
	}

	async getDashboardOutreachCases(params: ListingRequest) {
		try {
			const aggPipe = [];
			let { pageNo, limit, searchKey } = params;
			const match: any = {};
			match.status = DISPUTE_STATUS.OUTREACH;
			if (searchKey) {
				aggPipe.push(dispSearch(params.searchKey, ["lowerCaseDrn"]))
			}
			aggPipe.push({ "$match": match });
			aggPipe.push({ "$sort": { created: -1 } });

			if (params.limit && params.pageNo) {
				const [skipStage, limitStage] = this.addSkipLimit(
					params.limit,
					params.pageNo,
				);
				aggPipe.push(skipStage, limitStage);
			}

			const lookup: any = {
				from: DB_MODEL_REF.ADMIN,
				localField: "assignedToAdminId",
				foreignField: "_id",
				as: "adminDetails"
			}
			aggPipe.push({ "$lookup": lookup });
			aggPipe.push({
				"$unwind": {
					"path": "$adminDetails",
					"preserveNullAndEmptyArrays": true
				}
			});
			let project: any = {
				_id: 1,
				drn: 1,
				disputeId: 1,
				type: 1,
				assignedDate: 1,
				reviewDueDate: 1,
				status: 1,
				complainantType: 1,
				assignedToAdminId: 1,
				created: 1,
				adminName: "$adminDetails.name",
				adminEmail: "$adminDetails.email",
				adminstatus: "$adminDetails.status",
			};
			aggPipe.push({ "$project": project });

			return await this.dataPaginate(this.modelIdreCases, aggPipe, limit, pageNo, {}, true);
		}
		catch (error) {
			throw error;
		}
	}
}

export const adminDao = new AdminDao();