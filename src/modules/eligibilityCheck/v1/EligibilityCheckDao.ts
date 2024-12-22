"use strict";

import { BaseDao } from "@modules/baseDao/BaseDao";

import { DB_MODEL_REF, DISPUTE_STATUS, REDIS_PREFIX, REDIS_SUFFIX } from "@config/constant";
import { genRandomString, toObjectId } from "@utils/appUtils";
import { dispSearch } from "@modules/admin/searchMapper";
import { activityControllerV1 } from "@modules/activity";
import { createObjectCsvWriter } from "csv-writer"
import { imageUtil } from "@lib/ImageUtil";
import { SERVER } from "@config/environment";
import * as moment from 'moment';
import { CHECK_LIST, KAFKA_OBJECTION, REDIS } from "../eligibilityConstants";
import { mailManager, redisClient } from "@lib/index";
import { get } from "http";




export class EligibiltyCheckDao extends BaseDao {

    /**
     * @function caseManagementList
     * @author Chitvan Baish
     * @description function will give the list of all cases
     */
    async caseManagementList(params: EligibiltyCheckRequest.List, tokenData: TokenData) {
        try {
            try {
                const model: any = DB_MODEL_REF.IDRE_CASES
                let { pageNo, limit, searchKey, sortBy, sortOrder, status, fromDate, toDate, complainantType, disputeType } = params;
                const aggPipe = [];

                const match: any = {};
                if (status) {
                    match.status = { "$in": status };
                }
                if (params.fromDate && !params.toDate) match.reviewDueDate = { "$gte": params.fromDate };
                if (params.toDate && !params.fromDate) match.reviewDueDate = { "$lte": params.toDate };
                if (params.fromDate && params.toDate) match.reviewDueDate = { "$gte": params.fromDate, "$lte": params.toDate };

                if (params.assignedfromDate && !params.assignedtoDate) match.assignedDate = { "$gte": params.assignedfromDate };
                if (params.assignedtoDate && !params.assignedfromDate) match.assignedDate = { "$lte": params.assignedtoDate };
                if (params.assignedfromDate && params.assignedtoDate) match.assignedDate = { "$gte": params.assignedfromDate, "$lte": params.assignedtoDate };

                if (searchKey) {
                    aggPipe.push(dispSearch(params.searchKey, ["lowerCaseDrn"]))
                }
                if (complainantType) match.complainantType = { $in: complainantType }
                if (disputeType) match.type = { $in: disputeType }

                aggPipe.push({ "$match": match });

                let sort: any = {};
                (sortBy && sortOrder) ? sort = { [sortBy]: sortOrder } : sort = { "created": -1 };
                aggPipe.push({ "$sort": sort });

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



                return await this.dataPaginate(model, aggPipe, limit, pageNo, {}, true);
            } catch (error) {
                throw (error);
            }
        } catch (error) {
            throw error
        }
    }



    /**
     * @function caseManagementUnassignedList
     * @author Chitvan Baish
     * @description function will give the list of unassigned cases
     */
    async caseManagementUnassignedList(params: EligibiltyCheckRequest.List, tokenData: TokenData) {
        try {
            try {
                const model: any = DB_MODEL_REF.IDRE_CASES
                let { pageNo, limit, searchKey, sortBy, sortOrder, status, fromDate, toDate, assignedtoDate, assignedfromDate, complainantType, disputeType, objection } = params;
                const aggPipe = [];

                const match: any = {};
                match.assignedToAdminId = { $exists: false }
                if (status) {
                    match.status = { "$in": status };
                }
                if (objection && objection.length > 0) {
                    match.$or = objection.map((key: string) => {
                        return { [key]: true };
                    });
                }
                if (fromDate && !toDate) match.reviewDueDate = { "$gte": fromDate };
                if (toDate && !fromDate) match.reviewDueDate = { "$lte": toDate };
                if (fromDate && toDate) match.reviewDueDate = { "$gte": fromDate, "$lte": toDate };

                if (assignedfromDate && !assignedtoDate) match.assignedDate = { "$gte": assignedfromDate };
                if (assignedtoDate && !assignedfromDate) match.assignedDate = { "$lte": assignedtoDate };
                if (assignedfromDate && assignedtoDate) match.assignedDate = { "$gte": assignedfromDate, "$lte": assignedtoDate };

                if (searchKey) {
                    aggPipe.push(dispSearch(params.searchKey, ["lowerCaseDrn"]))
                }
                if (complainantType) match.complainantType = { $in: complainantType }
                if (disputeType) match.type = { $in: disputeType }

                aggPipe.push({ "$match": match });

                let sort: any = {};
                (sortBy && sortOrder) ? sort = { [sortBy]: sortOrder } : sort = { "updatedAt": -1 };
                aggPipe.push({ "$sort": sort });
                if (!params.isExport) {

                    if (params.limit && params.pageNo) {
                        const [skipStage, limitStage] = this.addSkipLimit(
                            params.limit,
                            params.pageNo,
                        );
                        aggPipe.push(skipStage, limitStage);
                    }
                }


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
                };
                aggPipe.push({ "$project": project });



                if (!params.isExport) {
                    return await this.dataPaginate(model, aggPipe, limit, pageNo, {}, true);
                } else {
                    const header = [
                        { id: 'drn', title: 'Dispute Refernece Number' },
                        { id: 'type', title: 'Dispute Type' },
                        { id: 'assignedDate', title: 'Date Assigned to IDRE' },
                        { id: 'reviewDueDate', title: 'Review Due Date' },
                        { id: 'status', title: 'Status' },
                        { id: 'complainantType', title: 'Complainant Type' }
                    ]
                    const data = {
                        aggPipe: aggPipe,
                        exportFileName: `UnassignedCaseManagement__${genRandomString(6)}.csv`,
                        header: header,
                    }
                    this.exportFiles(data, tokenData);

                    return true;
                    // return data;
                }
            } catch (error) {
                throw (error);
            }
        } catch (error) {
            throw error
        }
    }

    async exportFiles(params, tokenData: TokenData) {
        try {
            const model: any = DB_MODEL_REF.IDRE_CASES;
            const batchSize = 1000;
            let offset = 0;
            let hasMoreData = true;
    
            // Initialize CSV writer
            const csvWriterInstance = createObjectCsvWriter({
                path: `${SERVER.UPLOAD_DIR}` + params.exportFileName,
                header: params.header,
                append: true // Allows adding data in batches
            });
    
            // Write data in batches
            while (hasMoreData) {
                const result = await this.aggregate(model, [
                    ...params.aggPipe,
                    { $skip: offset },
                    { $limit: batchSize },
                ]);
    
                if (result.length === 0) {
                    hasMoreData = false;
                    break;
                }
    
                // Format dates for each record
                result.forEach((item: any) => {
                    item.assignedDate = moment(item.assignedDate).format('MM-DD-YYYY');
                    item.reviewDueDate = moment(item.reviewDueDate).format('MM-DD-YYYY');
                });
    
                // Write batch to CSV
                await csvWriterInstance.writeRecords(result);
                console.log(`Batch of ${result.length} records written to CSV.`);
    
                offset += batchSize;
            }
    
            console.log("CSV file writing completed.");
    
            // Upload the completed file to S3 and get the URL
            const data = {
                url: String(await imageUtil.uploadSingleMediaToS3(params.exportFileName)),
            };
    
            // Send email with download link
            mailManager.exportCassesFileMail({
                link: data.url,
                email: tokenData?.email,
                name: tokenData?.name,
                caseType: "Case_Management",
            });
    
        } catch (error) {
            console.error('Error exporting files:', error);
            throw error;
        }
    }

    /**
     * @function caseManagementMyList
     * @author Chitvan Baish
     * @description function will give the list of my cases
     */
    async caseManagementMyList(params: EligibiltyCheckRequest.List, tokenData: TokenData) {
        try {
            try {
                const model: any = DB_MODEL_REF.IDRE_CASES
                let { pageNo, limit, searchKey, sortBy, sortOrder, status, fromDate, toDate, assignedfromDate, assignedtoDate, complainantType, disputeType, objection } = params;
                const aggPipe = [];

                const match: any = {};
                match.assignedToAdminId = toObjectId(tokenData.userId)
                if (status) {
                    match.status = { "$in": status };
                }
                if (objection && objection.length > 0) {
                    match.$or = objection.map((key: string) => {
                        return { [key]: true };
                    });
                }
                if (fromDate && !toDate) match.reviewDueDate = { "$gte": fromDate };
                if (toDate && !fromDate) match.reviewDueDate = { "$lte": toDate };
                if (fromDate && toDate) match.reviewDueDate = { "$gte": fromDate, "$lte": toDate };

                if (assignedfromDate && !assignedtoDate) match.assignedDate = { "$gte": assignedfromDate };
                if (assignedtoDate && !assignedfromDate) match.assignedDate = { "$lte": assignedtoDate };
                if (assignedfromDate && assignedtoDate) match.assignedDate = { "$gte": assignedfromDate, "$lte": assignedtoDate };

                if (searchKey) {
                    aggPipe.push(dispSearch(params.searchKey, ["lswerCaseDrn"]))

                }
                if (complainantType) match.complainantType = { $in: complainantType }
                if (disputeType) match.type = { $in: disputeType }

                aggPipe.push({ "$match": match });

                let sort: any = {};
                (sortBy && sortOrder) ? sort = { [sortBy]: sortOrder } : sort = { "assignedCreated": -1 };
                aggPipe.push({ "$sort": sort });

                if (limit && pageNo) {
                    const [skipStage, limitStage] = this.addSkipLimit(
                        limit,
                        pageNo,
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

                if (!params.isExport) {
                    return await this.dataPaginate(model, aggPipe, limit, pageNo, {}, true);
                }
                else {
                    const header = [
                        { id: 'drn', title: 'Dispute Refernece Number' },
                        { id: 'type', title: 'Dispute Type' },
                        { id: 'assignedDate', title: 'Date Assigned to IDRE' },
                        { id: 'reviewDueDate', title: 'Review Due Date' },
                        { id: 'status', title: 'Status' },
                        { id: 'complainantType', title: 'Complainant Type' },
                        { id: 'adminName', title: 'Assigned Name' },
                        { id: 'adminEmail', title: 'Assigned Email' }
                    ]
                    const data = {
                        aggPipe: aggPipe,
                        exportFileName: `AssignedCaseToMeManagement__${genRandomString(6)}.csv`,
                        header: header,
                    }
                    this.exportFiles(data, tokenData);
                    return true;
                    // return data;
                }
            } catch (error) {
                throw (error);
            }
        } catch (error) {
            throw error
        }
    }

    /**
     * @function caseManagementAssignedList
     * @author Chitvan Baish
     * @description function will give the list of assigned cases
     */
    async caseManagementAssignedList(params: EligibiltyCheckRequest.List, tokenData: TokenData) {
        try {
            try {
                const model: any = DB_MODEL_REF.IDRE_CASES
                let { pageNo, limit, searchKey, sortBy, sortOrder, status, fromDate, toDate, assignedfromDate, assignedtoDate, complainantType, disputeType, objection } = params;
                const aggPipe = [];

                const match: any = {};
                match.assignedToAdminId = { $exists: true };
                if (status) {
                    match.status = { "$in": status };
                }
                if (objection && objection.length > 0) {
                    match.$or = objection.map((key: string) => {
                        return { [key]: true };
                    });
                }
                if (fromDate && !toDate) match.reviewDueDate = { "$gte": fromDate };
                if (toDate && !fromDate) match.reviewDueDate = { "$lte": toDate };
                if (fromDate && toDate) match.reviewDueDate = { "$gte": fromDate, "$lte": toDate };

                if (assignedfromDate && !assignedtoDate) match.assignedDate = { "$gte": assignedfromDate };
                if (assignedtoDate && !assignedfromDate) match.assignedDate = { "$lte": assignedtoDate };
                if (assignedfromDate && assignedtoDate) match.assignedDate = { "$gte": assignedfromDate, "$lte": assignedtoDate };
                if (params.adminId) {
                    const adminIds = params.adminId.map(id => toObjectId(id));
                    match.assignedToAdminId = { "$in": adminIds };
                }
                if (searchKey) {
                    aggPipe.push(dispSearch(searchKey, ["lowerCaseDrn"]))

                }
                if (complainantType) match.complainantType = { $in: complainantType }
                if (disputeType) match.type = { $in: disputeType }

                aggPipe.push({ "$match": match });

                let sort: any = {};
                (sortBy && sortOrder) ? sort = { [sortBy]: sortOrder } : sort = { "assignedCreated": -1 };
                aggPipe.push({ "$sort": sort });

                if (limit && pageNo) {
                    const [skipStage, limitStage] = this.addSkipLimit(
                        limit,
                        pageNo,
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
                        // "preserveNullAndEmptyArrays": true
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

                if (!params.isExport) {
                    return await this.dataPaginate(model, aggPipe, limit, pageNo, {}, true);
                }
                else {
                    const header = [
                        { id: 'drn', title: 'Dispute Refernece Number' },
                        { id: 'type', title: 'Dispute Type' },
                        { id: 'assignedDate', title: 'Date Assigned to IDRE' },
                        { id: 'reviewDueDate', title: 'Review Due Date' },
                        { id: 'status', title: 'Status' },
                        { id: 'complainantType', title: 'Complainant Type' },
                        { id: 'adminName', title: 'Assigned Name' },
                        { id: 'adminEmail', title: 'Assigned Email' }
                    ]
                    const data = {
                        aggPipe: aggPipe,
                        exportFileName: `AssignedCaseManagement__${genRandomString(6)}.csv`,
                        header: header,
                    }
                    this.exportFiles(data, tokenData);
                    return true;
                    // return data;
                }
            } catch (error) {
                throw (error);
            }
        } catch (error) {
            throw error
        }
    }



    async isDisputeExist(disputeId) {
        try {
            const query = { _id: toObjectId(disputeId) }
            const model: any = DB_MODEL_REF.DISPUTES
            return await this.findOne(model, query, { _id: 1, "dispute.disputeNumber": 1 })
        } catch (error) {
            throw error
        }
    }

    /**
     * @function myDisputeFiles
     * @author Chitvan Baish
     * @param disputeId
     * @description function will give the files of a particular dispute
     */
    async myDisputeFiles(params: EligibiltyCheckRequest.Details) {
        try {
            const model: any = DB_MODEL_REF.IDRE_CASES_FILES
            const match = { disputeId: toObjectId(params.disputeId) }
            const projection = {
                createdAt: 0,
                updatedAt: 0
            }
            return await this.findOne(model, match, projection)
        } catch (error) {
            throw error
        }
    }


    async eligibilityCheckList(params: EligibiltyCheckRequest.Details) {
        try {
            const model: any = DB_MODEL_REF.ELIGIBILITY_CHECK
            const match = { disputeId: toObjectId(params.disputeId) }
            const projection = {
                createdAt: 0,
                updatedAt: 0

            }
            const sort = { created: 1 }
            return await this.find(model, match, projection, {}, sort)
        } catch (error) {
            throw error
        }
    }

    async eligibilityObjectionCheckList(params: EligibiltyCheckRequest.Details) {
        try {
            const model: any = DB_MODEL_REF.ELIGIBILITY_CHECK
            const modelIdreCases: any = DB_MODEL_REF.IDRE_CASES
            const match = { disputeId: toObjectId(params.disputeId), objection: { $exists: true } }
            const matchIdre = { disputeId: toObjectId(params.disputeId) }
            const projection = {
                createdAt: 0,
                updatedAt: 0
            }
            const projectionIdre = {
                NO_OBJECTION: 1,
                STATE_PROCESS: 1,
                POLICY_YEAR: 1,
                SUBJECT_TO_NSA: 1,
                COVERED_BY_PLAN: 1,
                NOT_NSA_ELIGIBLE: 1,
                FOUR_DAY_TIMELINE: 1,
                INCORRECTLY_BATCHED: 1,
                INCORRECTLY_BUNDLED: 1,
                NOTICE_OF_INITIATION_NOT_SUBMITTED: 1,
                NEGOTIATION_NOT_COMPLETED: 1,
                NEGOTIATION_NOT_INITIATED: 1,
                COOLING_OFF_PERIOD: 1,
                OTHER: 1
            }
            const sort = { created: 1 }
            const step1 = await this.find(model, match, projection, {}, sort)
            const step2 = await this.findOne(modelIdreCases, matchIdre, projectionIdre)
            return { step1, step2 }
        } catch (error) {
            throw error
        }
    }

    async eligibilityOutreachCheckList(params: EligibiltyCheckRequest.Details) {
        try {
            const model: any = DB_MODEL_REF.ELIGIBILITY_CHECK
            const match = { disputeId: toObjectId(params.disputeId), status: DISPUTE_STATUS.OUTREACH }
            const projection = {
                createdAt: 0,
                updatedAt: 0
            }
            const sort = { created: 1 }
            return await this.find(model, match, projection, {}, sort)
        } catch (error) {
            throw error
        }
    }


    async disputeDetails(params, tokenData) {
        try {
            const modelIdr: any = DB_MODEL_REF.IDRE_CASES
            const model: any = DB_MODEL_REF.DISPUTES;
            const match = { _id: toObjectId(params.disputeId) };

            const projection = {
                _id: 1,
                // idrInfo:{
                //     disputeNumber: '$dispute.disputeNumber',
                //     disputeType: {
                //         $cond: {
                //             if: { $eq: ["$dispute.batchedItemsServices", "Yes"] },
                //             then: "BATCH",
                //             else: {
                //                 $cond: {
                //                     if: { $eq: ["$dispute.bundledItemsServices", "Yes"] },
                //                     then: "BUNDLE",
                //                     else: "SINGLE"
                //                 }
                //             }
                //         }
                //     },
                //     dateOfIDREAssignment:"$dispute.dateOfIDREAssignment",

                // },
                NoticeOfIDR: {
                    waiveSurpriseBillingProtections: "$dispute.waiveSurpriseBillingProtections",
                    initiatingParty: "$dispute.initiatingParty",
                    taxIdentifierNumberTaxID: "$dispute.taxIdentifierNumberTaxID",
                    nationalProviderIdentifierNPI: "$dispute.nationalProviderIdentifierNPI",
                    healthPlanType: "$dispute.healthPlanType",
                    openNegotiationPeriodStartDate: "$dispute.openNegotiationPeriodStartDate",
                    disputeLineItems: "$dispute.disputeLineItems",
                    submissionWindowExpiredReason: "$dispute.submissionWindowExpiredReason",
                    settlementValid: "$dispute.settlementValid",
                    settlementSubmitted: "$dispute.settlementSubmitted",
                    resubmissionForFollowingDispute: "$dispute.resubmissionForFollowingDispute",
                    reasonDisputeIsNotEligible: "$dispute.reasonDisputeIsNotEligible",
                    otherClosureReason: "$dispute.otherClosureReason",
                    objectionPlanPolicyYearStartDate: "$dispute.objectionPlanPolicyYearStartDate",
                    disputeStatus: "$dispute.disputeStatus",
                    disputeNotEligibleReason: "$dispute.disputeNotEligibleReason",
                    disputeEligible: "$dispute.disputeEligible",
                    compensationPaidToIdre: "$dispute.compensationPaidToIdre",
                    coiExists: "$dispute.coiExists",
                    closureReason: "$dispute.closureReason",
                    administrativeClosureReason: "$dispute.administrativeClosureReason",
                    paymentDeterminationOutcome: "$dispute.paymentDeterminationOutcome",
                    objectionOtherAdditionalDetails: "$dispute.objectionOtherAdditionalDetails",
                    objectionOpenNegCompleteDate: "$dispute.objectionOpenNegCompleteDate",
                    objectionItemsNotCoveredByPolicy: "$dispute.objectionItemsNotCoveredByPolicy",
                    objectionItemNotNSACovered: "$dispute.objectionItemNotNSACovered",
                    objectionIncorrectlyBundledList: "$dispute.objectionIncorrectlyBundledList",
                    objectionIncorrectlyBatchedList: "$dispute.objectionIncorrectlyBatchedList",
                    objectionDisputeNumberCoolingOff: "$dispute.objectionDisputeNumberCoolingOff",
                    objectionCoverageNotSubjectToNSA: "$dispute.objectionCoverageNotSubjectToNSA",
                    objectionCitationForStateLaw: "$dispute.objectionCitationForStateLaw",
                    objection4DayPeriodEndedOn: "$dispute.objection4DayPeriodEndedOn",
                    noticeOfOfferNIPLink: "$dispute.noticeOfOfferNIPLink",
                    noticeOfOfferIPLink: "$dispute.noticeOfOfferIPLink",
                    noticeOfOfferDueDate: "$dispute.noticeOfOfferDueDate",
                    lastModifiedDate: "$dispute.lastModifiedDate",
                    failureToSubmitOfferOrFee: "$dispute.failureToSubmitOfferOrFee",
                    entitySelectionDate: "$dispute.entitySelectionDate",
                    datePaymentDeterminationSent: "$dispute.datePaymentDeterminationSent",
                    dateOfIDREAssignment: "$dispute.dateOfIDREAssignment",
                    complainantAttestationDate: "$dispute.complainantAttestationDate",
                    complainantAttestationAgreement: "$dispute.complainantAttestationAgreement",
                    cmsAdminFee: "$dispute.cmsAdminFee",
                    bundledItemsServices: "$dispute.bundledItemsServices",
                    batchedItemsServices: "$dispute.batchedItemsServices",
                    attestIdrProcessApplies: "$dispute.attestIdrProcessApplies",
                    fehbEnrollmentCode: "$dispute.fehbEnrollmentCode",
                    extensionRequestedByInitiatingParty: "$dispute.extensionRequestedByInitiatingParty",
                    extensionRequestByNonInitiatingParty: "$dispute.extensionRequestByNonInitiatingParty",
                    entitySelectionDateCoiExists: "$dispute.entitySelectionDateCoiExists"
                },
                respondent: {
                    zip: "$dispute.respondentZip",
                    type: "$dispute.respondentType",
                    state: "$dispute.respondentState",
                    secondaryContactPhone: "$dispute.respondentSecondaryContactPhone",
                    secondaryContactName: "$dispute.respondentSecondaryContactName",
                    secondaryContactEmail: "$dispute.respondentSecondaryContactEmail",
                    primaryContactPhone: "$dispute.respondentPrimaryContactPhone",
                    primaryContactName: "$dispute.respondentPrimaryContactName",
                    primaryContactEmail: "$dispute.respondentPrimaryContactEmail",
                    phoneNumber: "$dispute.respondentPhoneNumber",
                    name: "$dispute.respondentName",
                    groupName: "$dispute.respondentGroupName",
                    fax: "$dispute.respondentFax",
                    emailAddress: "$dispute.respondentEmailAddress",
                    city: "$dispute.respondentCity",
                    addressLine2: "$dispute.respondentAddressLine2",
                    addressLine1: "$dispute.respondentAddressLine1",
                    nonInitiatingPartyStatusOfExtension: "$dispute.nonInitiatingPartyStatusOfExtension",
                    nonInitiatingPartyOffersOfPayment: "$dispute.nonInitiatingPartyOffersOfPayment",
                    nonInitiatingPartyInformationReceive: "$dispute.nonInitiatingPartyInformationReceive",
                    nonInitiatingPartyInformationNeeded: "$dispute.nonInitiatingPartyInformationNeeded",
                    nonInitiatingPartyInformationDetails: "$dispute.nonInitiatingPartyInformationDetails",
                    nonInitiatingPartyExtensionEndDate: "$dispute.nonInitiatingPartyExtensionEndDate",
                    nonInitiatingPartyEntityFeeReceived: "$dispute.nonInitiatingPartyEntityFeeReceived",
                    nonInitiatingPartyAdminFeeReceived: "$dispute.nonInitiatingPartyAdminFeeReceived",
                    nonInitiatingParty: "$dispute.nonInitiatingParty",
                    nipIneligibilityReason: "$dispute.nipIneligibilityReason",
                    natureOfNonInitiatingPartyCOI: "$dispute.natureOfNonInitiatingPartyCOI",
                    natureOfInitiatingPartyCOI: "$dispute.natureOfInitiatingPartyCOI",
                    nationalProviderIdentifierNPI: "$dispute.nationalProviderIdentifierNPI",
                    isTheErisaPlanSelfInsured: "$dispute.isTheErisaPlanSelfInsured"
                },
                complainant: {
                    zipCode: "$dispute.complainantZipCode",
                    type: "$dispute.complainantType",
                    state: "$dispute.complainantState",
                    secondaryContactPhone: "$dispute.complainantSecondaryContactPhone",
                    secondaryContactName: "$dispute.complainantSecondaryContactName",
                    secondaryContactEmail: "$dispute.complainantSecondaryContactEmail",
                    primaryContactPhone: "$dispute.complainantPrimaryContactPhone",
                    primaryContactName: "$dispute.complainantPrimaryContactName",
                    primaryContactEmail: "$dispute.complainantPrimaryContactEmail",
                    phoneNumber: "$dispute.complainantPhoneNumber",
                    name: "$dispute.complainantName",
                    groupName: "$dispute.complainantGroupName",
                    fax: "$dispute.complainantFax",
                    emailAddress: "$dispute.complainantEmailAddress",
                    city: "$dispute.complainantCity",
                    addressLine2: "$dispute.complainantAddressLine2",
                    addressLine1: "$dispute.complainantAddressLine1",
                    initiatingPartyStatusOfExtension: "$dispute.initiatingPartyStatusOfExtension",
                    initiatingPartyOffersOfPayment: "$dispute.initiatingPartyOffersOfPayment",
                    initiatingPartyInformationReceived: "$dispute.initiatingPartyInformationReceived",
                    initiatingPartyInformationNeeded: "$dispute.initiatingPartyInformationNeeded",
                    initiatingPartyInformationDetails: "$dispute.initiatingPartyInformationDetails",
                    initiatingPartyExtensionEndDate: "$dispute.initiatingPartyExtensionEndDate",
                    initiatingPartyEntityFeeReceived: "$dispute.initiatingPartyEntityFeeReceived",
                    initiatingPartyCOI: "$dispute.initiatingPartyCOI",
                    initiatingPartyAdminFeeReceived: "$dispute.initiatingPartyAdminFeeReceived",
                    initiatingParty: "$dispute.initiatingParty"
                },

            };

            const step1 = await this.findOne(model,
                match,
                projection
            )
            const project = {
                idrDetail: {
                    drn: "$drn",
                    type: "$type",
                    reviewDueDate: "$reviewDueDate",
                    status: "$status",
                    complainantType: "$complainantType",
                    assignedToAdminId: "$assignedToAdminId",
                    details: "$details",
                    reason: "$reason",
                    availableQPA:"$availableQPA"
                }
            }
            const step2 = await this.findOne(modelIdr, { disputeId: toObjectId(params.disputeId) }, project)
            return { ...step1, ...step2 }

        } catch (error) {
            throw error;
        }
    }

    async activityLog(params: EligibiltyCheckRequest.Details, tokenData: TokenData) {
        try {
            const model: any = DB_MODEL_REF.ACTIVITIES
            const match = { disputeId: toObjectId(params.disputeId) }
            let aggPipe = []
            aggPipe.push({ "$match": match });
            const sort = { created: -1 }
            aggPipe.push({ "$sort": sort })
            if (params.limit && params.pageNo) {
                const [skipStage, limitStage] = this.addSkipLimit(
                    params.limit,
                    params.pageNo,
                );
                aggPipe.push(skipStage, limitStage);
            }
            const lookup: any = {
                from: DB_MODEL_REF.ADMIN,
                localField: "adminId",
                foreignField: "_id",
                as: "adminDetails"
            }

            aggPipe.push({ "$lookup": lookup });
            aggPipe.push({
                "$unwind": {
                    "path": "$adminDetails",
                }
            });
            let project: any = {
                disputeId: 1,
                type: 1,
                details: 1,
                description: 1,
                created: 1,
                adminName: "$adminDetails.name",
                adminEmail: "$adminDetails.email",
            };
            aggPipe.push({ "$project": project });

            return await this.aggregate(model, aggPipe, {})
            // return await this.find(model,match,projection,{},sort)
        } catch (error) {
            throw error
        }
    }


    async assignNewUser(params: EligibiltyCheckRequest.Assign, tokenData: TokenData) {
        try {
            const model: any = DB_MODEL_REF.IDRE_CASES;
            let alreadyAssignedDispute: Array<string> = [];

            for (const id of params.disputeId) {
                const match = { disputeId: toObjectId(id), assignedToAdminId: { $exists: true } };
                const step1 = await this.findOne(model, match, { drn: 1 });
                if (step1) {
                    alreadyAssignedDispute.push(step1.drn);
                } else {
                    const match = { disputeId: toObjectId(id) };
                    const update = {
                        $set: {
                            assignedToAdminId: toObjectId(params.adminId),
                            assignedCreated: Date.now()
                        }
                    };
                    const activityData = {
                        adminId: toObjectId(params.adminId),
                        description: `Admin has assigned this case to @${params.adminId}`,
                        disputeId: toObjectId(id)
                    };

                    await this.updateOne(model, match, update, {});
                    activityControllerV1.addActivity(activityData);
                }
            }

            return alreadyAssignedDispute;
        } catch (error) {
            throw error;
        }
    }



    async unAssignUser(params, tokenData: TokenData) {
        try {
            const model: any = DB_MODEL_REF.IDRE_CASES
            const ids = params.disputeId.map((ids) => toObjectId(ids))
            const match = { disputeId: { $in: ids } }
            const adminIds = await this.find(model, match, { assignedToAdminId: 1, disputeId: 1 });
            const update = {
                $unset: {
                    assignedToAdminId: 1
                }
            }
            const result = await this.updateMany(model, match, update, {})
            for (let ids of adminIds) {
                const activityData = {
                    adminId: toObjectId(ids.assignedToAdminId),
                    description: `${tokenData.userId} Admin has un-assigned this case to @${ids.assignedToAdminId}`,
                    disputeId: toObjectId(ids.disputeId)
                };
                console.log(activityData);

                await activityControllerV1.addActivity(activityData);
            }
            return result;
        } catch (error) {
            throw error
        }
    }


    async reAssignUser(params, tokenData: TokenData) {
        try {
            const model: any = DB_MODEL_REF.IDRE_CASES
            const ids = params.disputeId.map((ids) => toObjectId(ids))
            const match = { disputeId: { $in: ids } }
            const update = {
                $set: {
                    assignedToAdminId: toObjectId(params.adminId),
                    assignedCreated: Date.now()
                }
            }
            const result = await this.updateMany(model, match, update, {})
            for (let id of params.disputeId) {
                const activityData = {
                    adminId: toObjectId(params.adminId),
                    description: `Admin has re-assigned this case to @${params.adminId}`,
                    disputeId: toObjectId(id)
                };

                await activityControllerV1.addActivity(activityData);
            }
            return result;

        } catch (error) {
            throw error
        }
    }

    async exportToCSV(data: any[], fileName: string, header: any) {
        const csvWriter = createObjectCsvWriter({
            path: `${SERVER.UPLOAD_DIR}` + fileName,
            header: header,
        });


        try {
            await csvWriter.writeRecords(data);
            return await imageUtil.uploadSingleMediaToS3(fileName);
        } catch (error) {
            console.error('Error writing CSV:', error);
        }
    }

    async disputeCheckSaveAndConclusion(request, response, bulkWriteOperations) {
        try {
            const model: any = DB_MODEL_REF.ELIGIBILITY_CHECK
            const adminModel: any = DB_MODEL_REF.ADMIN;
            const modelIdre:any = DB_MODEL_REF.IDRE_CASES
            console.log(JSON.stringify(bulkWriteOperations))
            await this.deleteMany(model,{disputeId:toObjectId(request.disputeId)})
            const update = {
                $set :{
                    STATE_PROCESS:false,
                    POLICY_YEAR:false  ,
                    SUBJECT_TO_NSA:false  ,
                    COVERED_BY_PLAN:false ,
                    NOT_NSA_ELIGIBLE:false ,
                    FOUR_DAY_TIMELINE: false,
                    INCORRECTLY_BATCHED: false,
                    INCORRECTLY_BUNDLED: false,
                    NOTICE_OF_INITIATION_NOT_SUBMITTED:false ,
                    NEGOTIATION_NOT_COMPLETED:false,
                    NEGOTIATION_NOT_INITIATED:false,
                    COOLING_OFF_PERIOD:false,
                    OTHER : false,
                    reason:{}
                }
            }
            await this.updateOne(modelIdre,{disputeId:toObjectId(request.disputeId)},update,{})
            const updateChecks = await this.bulkWrite(model, bulkWriteOperations).catch((error) => {
                console.log(error,':::::::::::::::::::::::::')
            });
            if (updateChecks && request?.adminId) {
                const admin = await this.findOne(adminModel, { _id: toObjectId(request.adminId) });
                const mailData = {
                    name: admin.name,
                    email: admin.email,
                    disputeNumber: request.disputeNumber
                }
                await mailManager.eligibilityChecksMail(mailData);
            }
            redisClient.deleteKey(`${REDIS_PREFIX.NAME}.${request.disputeId}`)
            // redisClient.deleteKey(`${REDIS_PREFIX.NAME}.${request.disputeId}.${REDIS_SUFFIX.RESCAN}`)
            redisClient.removeToSortedSet(REDIS.DISPUTE, request.disputeId)
            await this.disputeConclusion(request, response);




            // const updateIdre = await baseDao.updateOne(this.modelIdreCases,{disputeId:toObjectId(request.disputeId)},{$set:{status:idreStatus,details:response}},{})


        } catch (error) {
            console.error("Error in saving check:::::::::::::::",error)
            this.handleDisputeProcess(request)
        }
    }

    async disputeConclusion(request, response) {
        try {
            let queryNotEligible = [
                CHECK_LIST.SERVICE_PRIOR.NAME,
                // CHECK_LIST.COI.NAME,
                CHECK_LIST.TRIPLE_ZERO.NAME,
            ];
            let queryOutreach = [
                CHECK_LIST.LOCATION_OF_SERVICE.NAME,
                CHECK_LIST.OPEN_NEGOTIATION_DATE.NAME,
                CHECK_LIST.QPA_MISSING.NAME,
                CHECK_LIST.SERVICE_CODE_MISSING.NAME,
                CHECK_LIST.PLACE_OF_SERIVCE.NAME,
            ];
            let setObjection = [];
            let queryNotVerified = [];

            for (const item of response.details) {
                if (item.objection == KAFKA_OBJECTION.NEGOTIATION_NOT_COMPLETED) {
                    queryNotEligible.push(CHECK_LIST.IDRE_DATE.NAME, CHECK_LIST.TIMELY_OPEN_NEGOTIATION.NAME)
                    queryOutreach.push(CHECK_LIST.NPI.NAME, CHECK_LIST.TAXID.NAME)
                    setObjection.push({ NEGOTIATION_NOT_COMPLETED: true })

                }
                if (item.objection == KAFKA_OBJECTION.STATE_PROCESS) {
                    queryOutreach.push(CHECK_LIST.STATE_PROCESS.NAME)
                    queryNotEligible.push(CHECK_LIST.STATE_PROCESS.NAME)
                    setObjection.push({ STATE_PROCESS: true })
                }

                if (item.objection == KAFKA_OBJECTION.POLICY_YEAR) {
                    queryOutreach.push(CHECK_LIST.POLICY_YEAR.NAME)
                    queryNotEligible.push(CHECK_LIST.POLICY_YEAR.NAME)
                    setObjection.push({ POLICY_YEAR: true })

                }
                if (item.objection == KAFKA_OBJECTION.SUBJECT_TO_NSA) {
                    queryNotEligible.push(CHECK_LIST.SUBJECT_TO_NSA.NAME,CHECK_LIST.IDRE_DATE.NAME)
                    queryOutreach.push(CHECK_LIST.SUBJECT_TO_NSA.NAME)
                    setObjection.push({ SUBJECT_TO_NSA: true })
                }
                if (item.objection == KAFKA_OBJECTION.COVERED_BY_PLAN) {
                    queryNotEligible.push(CHECK_LIST.COVERED_BY_PLAN.NAME)
                    queryOutreach.push(CHECK_LIST.STATE_PROCESS.NAME, CHECK_LIST.COVERED_BY_PLAN.NAME)
                    setObjection.push({ COVERED_BY_PLAN: true })

                }
                if (item.objection == KAFKA_OBJECTION.NOT_NSA_ELIGIBLE) {
                    // queryNotEligible = [
                    //     CHECK_LIST.TIMELY_OPEN_NEGOTIATION.NAME,CHECK_LIST.IDRE_DATE.NAME,
                    // ]
                    // queryOutreach = [CHECK_LIST.NPI.NAME,CHECK_LIST.TAXID.NAME]
                    // setObjection = {$set: {NOT_NSA_ELIGIBLE:"exist"}}

                }
                if (item.objection == KAFKA_OBJECTION.FOUR_DAY_TIMELINE) {
                    queryNotEligible.push(CHECK_LIST.IDRE_DATE.NAME)
                    setObjection.push({ FOUR_DAY_TIMELINE: true })

                }
                if (item.objection == KAFKA_OBJECTION.INCORRECTLY_BATCHED) {
                    // queryNotEligible = [
                    //     CHECK_LIST.TIMELY_OPEN_NEGOTIATION.NAME,CHECK_LIST.IDRE_DATE.NAME,
                    // ]
                    // queryOutreach = [CHECK_LIST.NPI.NAME,CHECK_LIST.TAXID.NAME]
                    // setObjection = {$set: {INCORRECTLY_BATCHED:"exist"}}

                }
                if (item.objection == KAFKA_OBJECTION.INCORRECTLY_BUNDLED) {
                    // queryNotEligible = [
                    //     CHECK_LIST.TIMELY_OPEN_NEGOTIATION.NAME,CHECK_LIST.IDRE_DATE.NAME,
                    // ]
                    // queryOutreach = [CHECK_LIST.NPI.NAME,CHECK_LIST.TAXID.NAME]
                    // setObjection = {$set: {INCORRECTLY_BUNDLED:"exist"}}


                }
                if (item.objection == KAFKA_OBJECTION.NOTICE_OF_INITIATION_NOT_SUBMITTED) {
                    queryNotEligible.push(CHECK_LIST.IDRE_DATE.NAME, CHECK_LIST.NOTICE_OF_INITIATION_NOT_SUBMITTED.NAME)
                    queryOutreach.push(CHECK_LIST.NPI.NAME, CHECK_LIST.TAXID.NAME, CHECK_LIST.NOTICE_OF_INITIATION_NOT_SUBMITTED.NAME)
                    setObjection.push({ NOTICE_OF_INITIATION_NOT_SUBMITTED: true })


                }
                if (item.objection == KAFKA_OBJECTION.NEGOTIATION_NOT_INITIATED) {
                    queryNotEligible.push(CHECK_LIST.IDRE_DATE.NAME, CHECK_LIST.TIMELY_OPEN_NEGOTIATION.NAME)
                    queryOutreach.push(CHECK_LIST.NPI.NAME, CHECK_LIST.TAXID.NAME, CHECK_LIST.TIMELY_OPEN_NEGOTIATION.NAME)
                    setObjection.push({ NEGOTIATION_NOT_INITIATED: true })


                }
                if (item.objection == KAFKA_OBJECTION.OTHER) {
                    queryNotVerified.push(CHECK_LIST.OTHER.NAME)
                    setObjection.push({ OTHER: true })
                }
                if (item.objection == KAFKA_OBJECTION.COOLING_OFF_PERIOD) {
                    queryNotEligible.push(CHECK_LIST.IDRE_DATE.NAME, CHECK_LIST.PROOF_COOLING_OFF.NAME)
                    queryOutreach.push(CHECK_LIST.PROOF_COOLING_OFF.NAME)
                    setObjection.push({ COOLING_OFF_PERIOD: true })
                }
                if (item.objection == KAFKA_OBJECTION.NO_OBJECTION) {
                    await this.disputeConclusionWithoutObjection(request.disputeId)
                    return
                }




            }
            const update = [queryNotEligible, queryOutreach, setObjection, queryNotVerified]
            if(!response.details.length){
                return await this.disputeConclusionWithoutObjection(request.disputeId)
            }else{
                await this.disputeConclusionWithObjection(request, response, update)
            }
        } catch (error) {
            throw error
        }
    }

    async disputeConclusionWithObjection(request, response, update) {
        try {
            const model: any = DB_MODEL_REF.ELIGIBILITY_CHECK;
            const modelIdreCases: any = DB_MODEL_REF.IDRE_CASES;
            let idreStatus: string, reason: string[] = [];
            const [queryNotEligible, queryOutreach, setObjectionArray, queryNotVerified] = update;
            const disputeId = toObjectId(request.disputeId);

            // Utility function for querying by status
            const getCheckList = (status, query) =>
                this.find(model, { disputeId, status, name: { $in: query } }, { name: 1, statement: 1 });

            // Fetch all data concurrently
            const [CheclCOI, checkListBefore, checkListNotVerified, checkListNotEligible, checkListOutReach] = await Promise.all([
                getCheckList(DISPUTE_STATUS.NOT_ELIGIBLE, [CHECK_LIST.COI.NAME]),
                getCheckList(DISPUTE_STATUS.NOT_ELIGIBLE, [CHECK_LIST.TRIPLE_ZERO.NAME, CHECK_LIST.SERVICE_PRIOR.NAME]),
                getCheckList(DISPUTE_STATUS.NOT_VERIFIED, queryNotVerified),
                getCheckList(DISPUTE_STATUS.NOT_ELIGIBLE, queryNotEligible),
                getCheckList(DISPUTE_STATUS.OUTREACH, queryOutreach)
            ]);
            console.log(checkListNotEligible,checkListBefore,checkListOutReach);
            if(CheclCOI.length){
                idreStatus = DISPUTE_STATUS.COI_EXISTS;
            } else if (checkListBefore.length) {
                idreStatus = DISPUTE_STATUS.NOT_ELIGIBLE;
            } else if (!checkListNotEligible.length && !checkListOutReach.length) {
                idreStatus = DISPUTE_STATUS.ELIGIBLE;
            } else if (checkListOutReach.length) {
                reason = checkListOutReach.map(item => item.statement);
                idreStatus = DISPUTE_STATUS.OUTREACH;
            } else if (checkListNotEligible.length) {
                reason = checkListNotEligible.map(item => item.statement);
                idreStatus = DISPUTE_STATUS.NOT_ELIGIBLE;
            }

            const setObjection = Object.assign({}, ...setObjectionArray);

            await this.updateOne(modelIdreCases, { disputeId }, {
                $set: { status: idreStatus, reason, ...setObjection }
            }, {});

            console.log('*******************', checkListNotEligible, checkListOutReach, '******************');
        } catch (error) {
            throw error;
        }
    }


    async disputeConclusionWithoutObjection(disputeId) {
        try {
            const model: any = DB_MODEL_REF.ELIGIBILITY_CHECK;
            const modelIdreCases: any = DB_MODEL_REF.IDRE_CASES;
            let idreStatus: string;
            let reason: any = [];
    
            // Fetch all records for the given disputeId
            const checkList = await this.find(
                model,
                { disputeId: toObjectId(disputeId) },
                { name: 1, statement: 1, status: 1 } 
            );
    
            let isCOI = false, isOutreach = false, isNotEligible = false;
    
            checkList.forEach(item => {
                if (item.status === DISPUTE_STATUS.NOT_ELIGIBLE && item.name === CHECK_LIST.COI.NAME) {
                    isCOI = true;
                }
                if (item.status === DISPUTE_STATUS.NOT_ELIGIBLE && [CHECK_LIST.IDRE_DATE.NAME, CHECK_LIST.TRIPLE_ZERO.NAME, CHECK_LIST.SERVICE_PRIOR.NAME].includes(item.name)) {
                    isNotEligible = true;
                    reason.push(item.statement);
                }
                if (item.status === DISPUTE_STATUS.OUTREACH && [CHECK_LIST.TAXID.NAME, CHECK_LIST.NPI.NAME, CHECK_LIST.LOCATION_OF_SERVICE.NAME, CHECK_LIST.QPA_MISSING.NAME].includes(item.name)) {
                    isOutreach = true;
                    reason.push(item.statement); 
                }
            });
    
            // Determine the final idreStatus based on the conditions
            if (isCOI) {
                idreStatus = DISPUTE_STATUS.COI_EXISTS;
            } else if (!isNotEligible && !isOutreach) {
                idreStatus = DISPUTE_STATUS.ELIGIBLE;
            } else if (isOutreach) {
                idreStatus = DISPUTE_STATUS.OUTREACH;
            } else if (isNotEligible && !isOutreach) {
                idreStatus = DISPUTE_STATUS.NOT_ELIGIBLE;
            }
    
            // Update the dispute case with the new status and reasons
            await this.updateOne(
                modelIdreCases,
                { disputeId: toObjectId(disputeId) },
                { $set: { status: idreStatus, reason } },
                {}
            );
    
            console.log('*******************', checkList, '******************');
        } catch (error) {
            throw error;
        }
    }
    

    async handleDisputeProcess(params) {
        try {
            if (params?.disputeId) {
                const modelDispute: any = DB_MODEL_REF.DISPUTES
                const modelIdreCases: any = DB_MODEL_REF.IDRE_CASES
                const adminModel: any = DB_MODEL_REF.ADMIN
                const queryIdre = { disputeId: toObjectId(params.disputeId) }
                const updateIdre = { $set: { status: DISPUTE_STATUS.RE_CHECK } }
                const query = { _id: toObjectId(params.disputeId) }
                const update = { $set: { updateAt: Date.now() } }

                const step1 = await this.updateOne(modelIdreCases, queryIdre, updateIdre, {});
                const step2 = await this.updateOne(modelDispute, query, update, {})
                // redisClient.deleteKey(`${REDIS_PREFIX.NAME}.${params.disputeId}.${REDIS_SUFFIX.RESCAN}`)
                redisClient.removeToSortedSet(REDIS.DISPUTE, params.disputeId)
                const admin = await this.findOne(adminModel, { _id: toObjectId(params.adminId) });
                const mailData = {
                    name: admin.name,
                    email: admin.email,
                    disputeNumber: params.disputeNumber
                }
                await mailManager.eligibilityChecksErrorMail(mailData);
            }
        } catch (error) {
            console.error('Error in Handle Dispute Process: ', error)
            throw error
        }
    }

    async sendMailDisputeFail(params, tokenData) {
        try {
            const model: any = DB_MODEL_REF.DISPUTES;
            const match = { _id: toObjectId(params.disputeId) };
            const doc = await this.findOne(model, match, { "dispute.disputeNumber": 1 });
            const adminModel: any = DB_MODEL_REF.ADMIN
            const admin = await this.findOne(adminModel, { _id: toObjectId(tokenData.userId) });
            const mailData = {
                name: admin.name,
                email: admin.email,
                disputeNumber: doc.dispute.disputeNumber
            }
            await mailManager.eligibilityChecksErrorMail(mailData);
        } catch (error) {
            throw error
        }
    }


	async deleteDuplicateRecords() {
        try {
            const model:any = DB_MODEL_REF.DISPUTES;
            const aggPipe = [];
            const modelIdre: any = DB_MODEL_REF.IDRE_CASES
    
            aggPipe.push([
                {
                    $group: {
                        _id: "$dispute.disputeNumber",
                        count: { $sum: 1 },
                        ids: { $push: "$_id" } // Store the _id of each document in an array
                    }
                },
                {
                    $match: {
                        count: { $gt: 1 } // Filter for groups with more than one entry
                    }
                },
                {
                    $project: {
                        _id: 1,    // This is the disputeNumber
                        duplicateIds: "$ids" // Project the array of duplicate document IDs
                    }
                }
            ]);
            const result = await this.aggregate(model, aggPipe);
    
            // Create an array to store all duplicate IDs
            const allDuplicateIds = [];
            // return result

            result.forEach(item => {
                // Add all duplicate IDs except the first one to the allDuplicateIds array
                allDuplicateIds.push(...item.duplicateIds.slice(1));
            });

            // await this.deleteMany(model,{_id:{$in:allDuplicateIds}})
            // await this.deleteMany(modelIdre,{disputeId:{$in:allDuplicateIds}})
    
            return allDuplicateIds.length;
        } catch (error) {
            throw error;
        }
    }


    async updateDispute(){
        try {
            const model:any = DB_MODEL_REF.DISPUTES;
            const aggPipe = [];
            const modelIdre: any = DB_MODEL_REF.IDRE_CASES

            const step1 = await this.find(modelIdre, { status: "IN_PROGRESS" }, { disputeId: 1  });
            const disputeIds = await step1.map((ids)=>ids.disputeId)
            const updateDispute = await this.updateMany(model,{_id:{$in:disputeIds}},{ $set: { updateAt: Date.now() } },{})
            const step2 = await this.updateMany(modelIdre, {status: "IN_PROGRESS"}, {$set: {status: DISPUTE_STATUS.OPEN}},{} )
            return disputeIds.length

        } catch (error) {   
            throw error
        }
    }


    async checkQPA(disputeId, items, fetchFiles) {
        try {
            const availableFiles = {};
            const model:any = DB_MODEL_REF.IDRE_CASES;
    
            for (const [index, item] of items.entries()) {
                availableFiles[item.disputeLineItemNumber] = [];
                for (const file of item.files) {
                    // Find the actual matching fetchFile instead of just checking for true/false
                    const matchedFile = fetchFiles.find(fetchFile => fetchFile.name.includes(file.title));
                    
                    if (matchedFile) {
                        // Store the full matched file details
                        console.log(`File ${file.title} found in fetchFiles:`, matchedFile);
                        availableFiles[item.disputeLineItemNumber].push({
                            name: file.title,
                            status: "Yes",
                            url: matchedFile.url  // Store the details of the matched file
                        });
                    } else {
                        console.log(`File ${file.title} not found in fetchFiles.`);
                        availableFiles[item.disputeLineItemNumber].push({
                            name: file.title,
                            status: "No",
                        });
                    }
                }
            }
    
            // Update the database with the available files and their matching details
            await this.updateOne(
                model,
                { disputeId: toObjectId(disputeId) },
                { $set: { availableQPA: availableFiles } },
                {}
            );
        } catch (error) {
            throw error;
        }
    }
    

      async updateDisputeTime() {
        try {
            const model: any = DB_MODEL_REF.DISPUTES;
            const modelIdreFile:any = DB_MODEL_REF.IDRE_CASES_FILES
            const modelIdre:any = DB_MODEL_REF.IDRE_CASES
            // Step 1: Fetch 500 documents
            const aggPipe = []
            aggPipe.push({$match:{}})
            aggPipe.push({$sort:{updatedAt:-1}})

            const [skipStage, limitStage] = this.addSkipLimit(
                500,
                2,
            );
            aggPipe.push(skipStage, limitStage);

            aggPipe.push({$project:{
                _id:1
            }})
            const docs = await this.aggregate(model,aggPipe)
            // Step 2: Extract their IDs
            const ids = docs.map(doc => doc._id);
            console.log(ids)
    
            // Step 3: Update those documents
            await this.updateMany(model, { _id: { $in: ids } }, { $set: { updatedAt: Date.now() } },{});
            await this.deleteMany(modelIdre, {disputeId: {$in: ids}})
            return await this.deleteMany(modelIdreFile,{disputeId: {$in: ids}})
        } catch (error) {
            console.error("Error updating disputes:", error);
        }
    }


    async checkDisputeRecords() {
        try {
            const model: any = DB_MODEL_REF.DISPUTES;
            const modelIdreCases: any = DB_MODEL_REF.IDRE_CASES;
    
            // Step 1: Count documents in both models
            const step1 = await this.countDocuments(model, {});
            const step2 = await this.countDocuments(modelIdreCases, {});
            console.log(step1-step2)
            if (step1 === step2) {
                // If counts match, set Redis with updated timestamp
                redisClient.setExp(
                    `${REDIS_PREFIX.NAME}.${REDIS_SUFFIX.DISPUTE_MATCH}`,
                    SERVER.TOKEN_INFO.EXPIRATION_TIME.OPERATIONS / 1000,
                    JSON.stringify({ updatedAt: new Date().toISOString() })
                );
            } else {
                // Fetch data from Redis
                let getUpdatedValue: any = await redisClient.getValue(
                    `${REDIS_PREFIX.NAME}.${REDIS_SUFFIX.DISPUTE_MATCH}`
                );
                let matchDispute, matchIdre = {};
                getUpdatedValue = JSON.parse(getUpdatedValue);
                
                if (getUpdatedValue && getUpdatedValue.updatedAt) {
                    matchDispute = { updatedAt: { $gt: new Date(getUpdatedValue.updatedAt) } };
                    matchIdre = {createdAt: {$gt: new Date(getUpdatedValue.updatedAt)}};
                }
    
                // Retrieve all _id from Disputes and convert to strings
                const getDispute = await this.find(model, matchDispute, { _id: 1 });
                const disputeIds = getDispute.map((doc: any) => doc._id.toString());
    
                // Retrieve all disputeId from IDRE_CASES and convert to strings
                const getDisputeIdre = await this.find(modelIdreCases, matchIdre, { disputeId: 1 });
                const idreDisputeIds = getDisputeIdre.map((doc: any) => doc.disputeId.toString());
    
                // Filter out IDs that are not in IDRE_CASES
                const updatedIds = disputeIds.filter((id: string) => !idreDisputeIds.includes(id));
                console.log(updatedIds.length)
                if (updatedIds.length > 0) {
                    console.log(updatedIds);
                    // Optionally update the documents with the updated timestamp
                    await this.updateMany(model, { _id: { $in: updatedIds } }, { $set: { updatedAt: Date.now() } }, {});
                }
                return updatedIds;
            }
        } catch (error) {
            throw error;
        }
    }
    
    


    
    
}

export const eligibiltyCheckDao = new EligibiltyCheckDao();
