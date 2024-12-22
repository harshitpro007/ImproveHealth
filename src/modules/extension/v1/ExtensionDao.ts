"use strict";

import { DAY, DB_MODEL_REF, STATUS } from "@config/constant";
import { BaseDao } from "@modules/baseDao/BaseDao";
import { generateMongoId, toObjectId } from "@utils/appUtils";
import moment = require("moment");


export class ExtensionDao extends BaseDao {
 
    public model:any = DB_MODEL_REF.EXTENSION
    async addExtension(params:ExtensionRequest.Add){
        try {
			const oneDayInMs = 24 * 60 * 60 * 1000; // 86,400,000 ms in one day
			const {startDate, endDate} = params
			// let dateArray: number[] = [];

			// Iterate through the range and add each day as a timestamp
			params.groupId = generateMongoId()
			for (let currentDate = startDate; currentDate <= endDate; currentDate += oneDayInMs) {
				params.startDate = currentDate;
				const date = moment(currentDate);
				const isBusinessDay = date.isoWeekday() < 6;
				params.day = (isBusinessDay) ? DAY.WEEKDAY : DAY.WEEKEND
				console.log(params,'::::::::::')
				await this.save(this.model,params)
				// dateArray.push(currentDate);
			}

            // return await this.save(this.model,params)
        } catch (error) {
            throw error
        }
    }

    async deleteExtension(params:ExtensionRequest.ID){
        try {
            const match = {groupId:toObjectId(params.extensionId),status:STATUS.UN_BLOCKED}
            const update = {
                $set: {
                    status: STATUS.DELETED
                }
            }
            return await this.updateMany(this.model,match,update,{})
        } catch (error) {
            throw error
        }
    }

    async isExtensionExist(params:ExtensionRequest.ID){
        try {
            const match = {groupId:toObjectId(params.extensionId),status:STATUS.UN_BLOCKED}
            return await this.findOne(this.model,match)
        } catch (error) {
            throw error
        }
    }

    async getList(params: ListingRequest) {
		try {
			const aggPipe = [];
	
			const match: any = {};
			match.status = STATUS.UN_BLOCKED;
	
			// Apply date range filters
			if (params.fromDate && !params.toDate) match.startDate = { "$gte": params.fromDate };
			if (params.toDate && !params.fromDate) match.startDate = { "$lte": params.toDate };
			if (params.fromDate && params.toDate) match.startDate = { "$gte": params.fromDate, "$lte": params.toDate };
	
			// Step 1: Match stage
			aggPipe.push({ "$match": match });
	
			
	
			// Step 3: Group by groupId (or _id if groupId is missing) and pick the first document in each group
			aggPipe.push({
				"$group": {
					"_id": { "$ifNull": ["$groupId", "$_id"] },  // Use groupId if exists, else _id
					"firstItem": { "$first": "$$ROOT" },         // Get the first document in each group
					// "count": { "$sum": 1 }                      // Optional: keep count if needed
				}
			});
			aggPipe.push({
				"$replaceRoot": { newRoot: "$firstItem" }
			});

			
	
			// Step 4: Optionally add any additional fields or structure
			// aggPipe.push({
			// 	"$addFields": {
			// 		"groupId": "$_id",  // Move _id to groupId for clarity
			// 		"numberOfItems": "$count", // Optional: keep count if needed
			// 		"item": "$firstItem"       // First item in the group
			// 	}
			// });
	
			// Step 5: Skip/Limit for pagination
			if (params.limit && params.pageNo) {
				const [skipStage, limitStage] = this.addSkipLimit(
					params.limit,
					params.pageNo,
				);
				aggPipe.push(skipStage, limitStage);
			}
			
			let sort = {};
			(params.sortBy && params.sortOrder) ? sort = { [params.sortBy]: params.sortOrder } : sort = { startDate: -1 };
			aggPipe.push({ "$sort": sort });
	
			// Execute aggregation with options like collation
			const options = { collation: true };
			const response = await this.dataPaginate(this.model, aggPipe, params.limit, params.pageNo, options, true);
	
			return response;
	
		} catch (error) {
			throw error;
		}
	}
	
	

    async ipList(params: ListingRequest){
        try {
            const model: any = DB_MODEL_REF.IP_LISTING
			const aggPipe = [];

			const match: any = {};
            match.status = STATUS.UN_BLOCKED;
			if (params.searchKey) {
				match.name = {"$regex":params.searchKey, "$options": "i" }
			}
			aggPipe.push({ "$match": match });

			aggPipe.push({ "$sort": {created:-1} });

			if (params.limit && params.pageNo) {
				const [skipStage, limitStage] = this.addSkipLimit(
					params.limit,
					params.pageNo,
				);
				aggPipe.push(skipStage, limitStage);
			}

            aggPipe.push({
                $project:{
                    name:1
                }
            })
			
			const options = { collation: true };

			const response = await this.dataPaginate(model, aggPipe, params.limit, params.pageNo, options, true);
			return response;
		} catch (error) {
			throw error;
		}
    }

    async nipList(params: ListingRequest){
        try {
            const model:any = DB_MODEL_REF.NIP_LISTING
			const aggPipe = [];

			const match: any = {};
            match.status = STATUS.UN_BLOCKED;
			if (params.searchKey) {
				match.name = {"$regex":params.searchKey, "$options": "i" }
			}
			
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
            aggPipe.push({
                $project:{
                    name:1
                }
            })
			const options = { collation: true };
			const response = await this.dataPaginate(model, aggPipe, params.limit, params.pageNo, options, true);
			return response;
		} catch (error) {
			throw error;
		}
    }


}

export const extensionDao = new ExtensionDao();