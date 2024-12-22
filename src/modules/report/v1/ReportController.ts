"use strict";

import * as _ from "lodash";
import * as crypto from "crypto";


import { MESSAGES } from "@config/index";
import { reportDaoV1 } from "@modules/report/index";
import { MailManager } from "@lib/MailManager";
const mailManager = new MailManager();

export class ReportController {

    /**
     * @function reportPostList
     * @description Get the listing of reported post list
     */
    async reportPostList(params: ReportRequest.Detail,tokenData: TokenData){
		try{
			const reportPostList =  await reportDaoV1.reportPostList(params);
            return MESSAGES.SUCCESS.LISTING(reportPostList)

		}catch(error){

		}
	}

    /**
     * @function reportCommentDetail
     * @description get the details of reported comments
     */
    async reportCommentDetail(params: ReportRequest.CommentDetail,tokenData: TokenData){
		try{
			const reportCommentDetail =  await reportDaoV1.reportCommentDetail(params);
            return MESSAGES.SUCCESS.DETAILS(reportCommentDetail)

		}catch(error){

		}
	}
	
}

export let reportController = new ReportController();