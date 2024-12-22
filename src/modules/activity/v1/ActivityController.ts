"use strict";

import { ACTIVITY_TYPE, DB_MODEL_REF } from "@config/constant";
import { baseDao } from "@modules/baseDao";
import { toObjectId } from "@utils/appUtils";

export class ActivityController {
    public model:any = DB_MODEL_REF.ACTIVITIES


    async addActivity(params){
        try {
            return await baseDao.save(this.model,params)
        } catch (error) {
            throw error
        }
    }

    async loginActivity(adminId:string){
        try {
            const description = `@${adminId} has logged into the portal`;
            const activityData = {
                adminId:toObjectId(adminId),
                description:description
            }
            return await baseDao.save(this.model,activityData)
        } catch (error) {
            throw error
        }
    }


    async caseDownLoadFilesActivityLog(params: ActivityRequest.loginActivity, tokenData: TokenData) {
        try {
            let activityData: any = {
                adminId: toObjectId(tokenData.userId),
                disputeId: toObjectId(params.disputeId),
                type: ACTIVITY_TYPE.FILE,
                description: '',
            };
    
            if (params.allDownload) {
                activityData.description = `@${tokenData.userId} has downloaded all files`;
            } else {
                activityData.details = {
                    name: params.name,
                    url: params.url,
                };
                activityData.description = `@${tokenData.userId} has downloaded the file: ${params.name}`;
            }
    
            return await baseDao.save(this.model, activityData);
        } catch (error) {
            throw error;
        }
    }
    

}

export const activityController = new ActivityController();