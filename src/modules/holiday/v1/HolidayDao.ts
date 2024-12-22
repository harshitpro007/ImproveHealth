"use strict";

import { BaseDao } from "@modules/baseDao/BaseDao";

import { DAY, DB_MODEL_REF, STATUS } from "@config/constant";
import * as moment from "moment"
import { toObjectId } from "@utils/appUtils";
import { Search } from "@modules/admin/searchMapper";

export class HolidayDao extends BaseDao {


    public modelHoliday:any = DB_MODEL_REF.HOLIDAYS
    async isHolidayExist(holidayId){
        try {
            const match = {
                _id : toObjectId(holidayId),
                status: STATUS.UN_BLOCKED
            }
            return this.findOne(this.modelHoliday, match, {_id:1,name:1})
        } catch (error) {
            
        }
    }


	/**
	 * @function addHoliday
     * @params name, date required
     * @author Chitvan Baish
     * @description this function will update the existing once and add new entry
	 */
    async addHoliday(params:HolidayRequest.Add){
        try {
            const bulkWriteOperations = await Promise.all(
                params.holidayDate.map(async (holiday, index) => {

                    const date = moment(holiday.date);
                    const isBusinessDay = date.isoWeekday() < 6;
                    const insertingProduct = {
                        // insertOne: {
                        //     document: {
                        //         name: holiday.name,
                        //         date: holiday.date,
                        //         day: (isBusinessDay) ? DAY.WEEKDAY : DAY.WEEKEND
                        //     },
                        // },
                        updateOne: {
                            filter: { date: holiday.date, status: STATUS.UN_BLOCKED },
                            update: { $set: {...holiday,day:(isBusinessDay) ? DAY.WEEKDAY : DAY.WEEKEND} },
                            upsert: true,
                        },
                    };
                    return insertingProduct;
                })
            );
           return await this.bulkWrite(this.modelHoliday, bulkWriteOperations);
        } catch (error) {
            throw error
        }
    }

    /**
	 * @function editHoliday
     * @params name, date, holidayId required
     * @author Chitvan Baish
     * @description this function will update the existing once and add new entry
	 */
    async editHoliday(params:HolidayRequest.Edit){
        try {
            const date = moment(params.date);
            const isBusinessDay = date.isoWeekday() < 6;
            const match = {_id:params.holidayId}
            const update = {
                $set: {name:params.name, date: params.date, day:(isBusinessDay) ? DAY.WEEKDAY : DAY.WEEKEND, status: STATUS.UN_BLOCKED}
            }
            const options = {new:true}
            return await this.findOneAndUpdate(this.modelHoliday,match,update,options)
        } catch (error) {
            throw error
        }
    }


    /**
	 * @function deleteHoliday
     * @params holidayId required
     * @author Chitvan Baish
     * @description this function will delete the holiday date
	 */
    async deleteHoliday(params:HolidayRequest.Delete){
        try {
            const match = {_id: toObjectId(params.holidayId)}
            const update = {$set:{status:STATUS.DELETED}}
            const options = {new:true}

            return await this.findOneAndUpdate(this.modelHoliday,match,update,options)
        } catch (error) {
            throw error
        }
    }


    /**
	 * @function getHolidayList
     * @params fromDate and endDate required
     * @author Chitvan Baish
     * @description this function will give the list of holiday
	 */
    async getHolidayList(params:HolidayRequest.Get){
        try {
            const aggPipe = [];

			const match: any = {};
			match.status = { "$in": [STATUS.BLOCKED, STATUS.UN_BLOCKED] };
            match.date = {$gte:params.fromDate, $lte:params.endDate}

			if (params.searchKey) {
				match.name = {"$regex":params.searchKey, "$options": "i" }

			}
			// aggPipe.push({ "$match": match });
            const projection = {_id:1,name:1,date:1}
            const sort = {date:1}

            return await this.find(this.modelHoliday,match,projection,sort)
        } catch (error) {
            throw error
        }
    }



}

export const holidayDao = new HolidayDao();