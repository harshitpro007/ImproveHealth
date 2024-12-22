"use strict";

import { MESSAGES } from "@config/constant";
import { activityControllerV1 } from "@modules/activity";
import { holidayDaoV1 } from "@modules/holiday/index";
import { toObjectId } from "@utils/appUtils";


export class HolidayController {

    /**
     * @function addHoliday
     * @params name, date required
     * @author Chitvan Baish
     * @description this function will update the existing once and add new entry
     */
    async addHoliday(params: HolidayRequest.Add, tokenData: TokenData) {
        try {
            const result = await holidayDaoV1.addHoliday(params)
            if(result) {
                const activityData = {
                    adminId:toObjectId(tokenData.userId),
                    description:`@${tokenData.userId} has added new holidays`
                }
                activityControllerV1.addActivity(activityData)
            }
            return MESSAGES.SUCCESS.ADD_HOLIDAY
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
    async editHoliday(params: HolidayRequest.Edit, tokenData: TokenData) {
        try {
            const result = await holidayDaoV1.editHoliday(params)
            if(result) {
                const activityData = {
                    adminId:toObjectId(tokenData.userId),
                    description:`@${tokenData.userId} has edited a holiday`,
                    details: {
                        value:params?.name
                    }
                }
                activityControllerV1.addActivity(activityData)
            }
            return MESSAGES.SUCCESS.UPDATE_HOLIDAY(result)
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
    async deleteHoliday(params: HolidayRequest.Delete, tokenData: TokenData) {
        try {
            const isHolidayExist = await holidayDaoV1.isHolidayExist(params.holidayId)
            if (!isHolidayExist) return Promise.reject(MESSAGES.ERROR.NOT_EXIST_HOLIDAY)
            const result = await holidayDaoV1.deleteHoliday(params)
            if(result) {
                const activityData = {
                    adminId:toObjectId(tokenData.userId),
                    description:`@${tokenData.userId} has edited a holiday`,
                    details: {
                        value:isHolidayExist.name
                    }
                }
                activityControllerV1.addActivity(activityData)
            }
            return MESSAGES.SUCCESS.DELETE_HOLIDAY
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
    async getHolidayList(params: HolidayRequest.Get) {
        try {
            const result = await holidayDaoV1.getHolidayList(params);
            return MESSAGES.SUCCESS.DETAILS(result)
        } catch (error) {
            throw error
        }
    }


  

}

export const holidayController = new HolidayController();