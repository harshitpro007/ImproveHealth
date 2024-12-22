"use strict";

import * as _ from "lodash";
import { BaseDao } from "@modules/baseDao/BaseDao";

import { DB_MODEL_REF } from "@config/index";
import { toObjectId } from "@utils/appUtils";
import { userLookup } from "./reportMapper";

export class ReportDao extends BaseDao {



	async reportPostList(params: ReportRequest.Detail){
		try{
			const aggPipe = [];
			const model:any = DB_MODEL_REF.REPORT_POST
			const match = {
				postId: toObjectId(params.postId)
			}
			aggPipe.push({$match: match});
			if (params.limit && params.pageNo) {
                const [skipStage, limitStage] = this.addSkipLimit(
                    params.limit,
                    params.pageNo,
                );
                aggPipe.push(skipStage, limitStage);
            }
			aggPipe.push({ ...userLookup });

			aggPipe.push(
				{
					$unwind: "$user_detail", // Unwind the user_detail array
				},
				{
					$project: {
						username: "$user_detail.name", 
						created:1,
						reportReason:1

					},
				}
			)
			return await this.dataPaginate(model, aggPipe, params.limit, params.pageNo, {}, true);

		}catch(error){

		}
	}


	async reportCommentDetail(params){
		try{
			const model:any = DB_MODEL_REF.REPORT_COMMENT
			const aggPipe = [];
			const match = {
				commentId: toObjectId(params.commentId),
			}
			aggPipe.push({$match: match});
			if (params.limit && params.pageNo) {
                const [skipStage, limitStage] = this.addSkipLimit(
                    params.limit,
                    params.pageNo,
                );
                aggPipe.push(skipStage, limitStage);
            }
			aggPipe.push({...userLookup})
			aggPipe.push(
				{
					$unwind: "$user_detail", // Unwind the user_detail array
				},
				{
					$project: {
						username: "$user_detail.name", 
						created:1,
						reportReason:1,
						commentCocntent:1,
					},
				}
			)
			return await this.dataPaginate(model, aggPipe, params.limit, params.pageNo, {}, true);

		}catch(error){

		}
	}

	

}

export let reportDao = new ReportDao();