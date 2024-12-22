"use strict";

import { DAY, DB_MODEL_REF, DISPUTE, DISPUTE_STATUS, ENVIRONMENT, FILE_EXTENTION, KAFKA_TOPICS_PRODUCER, MESSAGES, REDIS_PREFIX, REDIS_SUFFIX, STATUS } from "@config/constant";
import { SERVER } from "@config/environment";
import { baseDao } from "@modules/baseDao";
import { disputes, eligibiltyCheckDaoV1, eligibiltyCheckMapperV1 } from "@modules/eligibilityCheck/index";
import { toObjectId } from "@utils/appUtils";
import * as moment from 'moment';
import 'moment-business-days';
import * as AWS from 'aws-sdk';
import { activityControllerV1 } from "@modules/activity";
import { adminDaoV1 } from "@modules/admin";
import { kafkaProducerObjection } from "@lib/kafkaProducer/ObjectionRequest";
const path = require('path');
import { simpleParser } from 'mailparser';
import puppeteer from 'puppeteer';
import MsgReader from '@kenjiuno/msgreader'
import { redisClient } from "@lib/index";
import { DATE_PATTERN, REDIS, SUBMISSION_WINDOW } from "../eligibilityConstants";
import * as mammoth from "mammoth";
import axios from "axios";
const https = require("https");

export class EligibiltyCheckController {

	public modelLastScan: any = DB_MODEL_REF.LAST_SCAN
	public modelIdreCases: any = DB_MODEL_REF.IDRE_CASES
	public model: any = DB_MODEL_REF.DISPUTES
	public modelEligible: any = DB_MODEL_REF.ELIGIBILITY_CHECK
	public modelIdreCasesFile: any = DB_MODEL_REF.IDRE_CASES_FILES
	async addDataInModel(params) {
		try {
			const checkDataPresent = await baseDao.findOne(this.model, { "dispute.disputeNumber": params.dispute?.disputeNumber })
			if (checkDataPresent) return Promise.reject(MESSAGES.ERROR.DISPUTE_ALREADY_PRESENT)
			return baseDao.save(this.model, params)
		} catch (error) {
			throw error
		}
	}

	/**
	 * @author Chitvan Baish
	 * @function saveNewFiles
	 * @description Optimized function to fetch the latest data from dispute collection and start the eligibility process
	 */
	async saveNewFiles() {
		try {
			// Start background processing without waiting for it
			this.processNewFilesInBackground();
			
			// Return success message immediately
			return MESSAGES.SUCCESS.SYNC;
	
		} catch (error) {
			console.error('Error in saveNewFiles:', error);
		}
	}
	
	async processNewFilesInBackground() {
		try {
			const match = {};
			const { LAST_SCAN}: {
				LAST_SCAN: any,
			} = DB_MODEL_REF;
			
			// Fetch the latest scan date
			const step1 = await baseDao.findOne(LAST_SCAN, match, { lastScanDate: 1 }, {}, { created: -1 });
			const query = step1 ? { updatedAt: { $gt: step1.lastScanDate } } : {};
	
			// Get all disputes that match the query and divide them into chunks
			const disputesCursor = disputes.find(query).sort({ updatedAt: 1 }).cursor({ batchSize: SERVER.CHUNK_SIZE });
			let disputeBatch = [];
	
			// Collect documents from cursor into batches
			for await (const document of disputesCursor) {
				disputeBatch.push(document);
	
				if (disputeBatch.length === SERVER.CHUNK_SIZE) {
					// Log the batch processing
					console.log(`Processing batch of ${SERVER.CHUNK_SIZE} disputes...`);
					await this.processDisputeBatch(disputeBatch);
					console.log(`Successfully processed batch of ${SERVER.CHUNK_SIZE} disputes.`);
	
					// Clear the batch after processing
					disputeBatch = [];
					console.log('Next batch is going to execute...');
				}
			}
	
			// Process any remaining disputes (if less than batchesize)
			if (disputeBatch.length > 0) {
				console.log(`Processing final batch of ${disputeBatch.length} disputes...`);
				await this.processDisputeBatch(disputeBatch);
				console.log(`Successfully processed final batch of ${disputeBatch.length} disputes.`);
				
			}
	
		} catch (error) {
			console.error('Error in processNewFilesInBackground:', error);
		}
	}
	
	
	
	async processDisputeBatch(batch) {
		try {
			await Promise.all(batch.map(async (document) => {
				try {
					const { LAST_SCAN, IDRE_CASES, IDRE_CASES_FILES, IP_LISTING, NIP_LISTING, }: {
						LAST_SCAN: any,
						IDRE_CASES: any,
						IDRE_CASES_FILES: any,
						IP_LISTING: any,
						NIP_LISTING: any,
					} = DB_MODEL_REF;
					const { dispute: doc, _id: disputeId } = document;
					const disputeType = doc.batchedItemsServices === "Yes" ? DISPUTE.BATCH :
						doc.bundledItemsServices === "Yes" ? DISPUTE.BUNDLE : DISPUTE.SINGLE;
	
					const dateOfIDREAssignment = moment.utc(doc.dateOfIDREAssignment, 'YYYY-MM-DD');
					const futureDate = await this.calculateReviewDate(doc.dateOfIDREAssignment);
	
					const updateIdreCasesData = {
						$set: {
							disputeId,
							drn: doc.disputeNumber,
							lowerCaseDrn: doc.disputeNumber.split('-')[1],
							type: disputeType,
							assignedDate: dateOfIDREAssignment.unix() * 1000,
							reviewDueDate: futureDate.unix() * 1000,
							complainantType: doc.complainantType,
							status: DISPUTE_STATUS.OPEN,
						},
					};
	
					const saveLastScanData = {
						lastScanDate: document.updatedAt,
						disputeId,
					};
	
					// Fetch files from AWS S3
					const fetchFiles = await this.fetchFiles(doc.disputeNumber);
					const updateFilesPromise = {
						$set: {
							files: fetchFiles,
							drn: doc.disputeNumber,
						},
					};
					const ip_name = doc.complainantName.toLowerCase().trim();
					const nip_name = doc.respondentName.toLowerCase().trim();
	
					// Perform database updates and eligibility checks concurrently
					await Promise.all([
						baseDao.findOneAndUpdate(IP_LISTING, { name: ip_name }, { name: ip_name }, { upsert: true }).catch(err => {
							console.warn(`Error saving IP_LISTING for ${ip_name}:`, err);
						}),
						baseDao.findOneAndUpdate(NIP_LISTING, { name: nip_name }, { name: ip_name }, { upsert: true }).catch(err => {
							console.warn(`Error saving NIP_LISTING for ${nip_name}:`, err);
						}),
						baseDao.updateOne(IDRE_CASES_FILES, { disputeId: toObjectId(disputeId) }, updateFilesPromise, { upsert: true }),
						baseDao.updateOne(IDRE_CASES, { disputeId }, updateIdreCasesData, { upsert: true }),
						baseDao.save(LAST_SCAN, saveLastScanData),
						// redisClient.addToSortedSet(REDIS.DISPUTE, Date.now(), disputeId)
					]);
	
					// Eligibility criteria check once all data is updated
					if ((SERVER.ENVIRONMENT == ENVIRONMENT.PREPROD || SERVER.ENVIRONMENT == ENVIRONMENT.PRODUCTION) && document.dispute.submissionWindowExpiredReason !== SUBMISSION_WINDOW.RESUBMISSION) {
						await this.commonEligibiltyCriteriaCheck(document, fetchFiles);
					}
	
				} catch (error) {
					await baseDao.updateOne(this.modelIdreCases, { disputeId: toObjectId(document._id) }, { $set: { status: DISPUTE_STATUS.RE_CHECK } }, {});
					// redisClient.removeToSortedSet(REDIS.DISPUTE, document._id);
					await baseDao.updateOne(this.model, { _id: toObjectId(document._id) }, { $set: { updateAt: Date.now() } }, {});
					console.error(`Error processing disputeId ${document._id}:`, error);
				}
			}));
		} catch (error) {
			console.error('Error processing batch:', error);
		}
	}
	


	/**
	 * @author Chitvan Baish
	 * @function commonEligibiltyCriteriaCheck
	 * @description This function will start checking the eligibility of dispute
	 */
	async commonEligibiltyCriteriaCheck(document, fetchFiles, adminId?: string) {
		try {
			const doc = document.dispute
			if(!fetchFiles.length) return await baseDao.updateOne(this.modelIdreCases, { disputeId: toObjectId(document._id) }, {$set:{status:DISPUTE_STATUS.IN_COMPLETE}}, {});

			if (doc.bundledItemsServices == 'No' && doc.batchedItemsServices == "No") {
				const update = {
					$set: {
						status: DISPUTE_STATUS.IN_PROGRESS
					}
				}
				baseDao.updateOne(this.modelIdreCases, { disputeId: toObjectId(document._id) }, update, {});
				await redisClient.addToSortedSet(REDIS.DISPUTE, Date.now(), String(document._id));
				await eligibiltyCheckDaoV1.checkQPA(document._id,doc.disputeLineItems,fetchFiles);
				const checkIdredata = {
					submissionWindowExpiredReason:doc.submissionWindowExpiredReason, 
					startDate: doc.openNegotiationPeriodStartDate,
					endDate: doc.complainantAttestationDate, 
					nipName: doc.respondentName, 
					ipName: doc.complainantName, 
					complainantAttestationDate: doc.complainantAttestationDate,
					state: [doc.respondentState,doc.complainantState,doc.disputeLineItems[0].locationOfService]
				  }
				const [
					byDefaultSetServicePrior,
					// checkCOI, 
					checkInitiatingParty,
					checkTaxIdentifierNumberTaxID,
					checkNationalProviderIdentifierNPI,
					checkOpenNegotiation,
					checkPartiesInfo,
					checkLineItemsInfo,
					checkIDRENegotiation
				] = await Promise.all([
					eligibiltyCheckMapperV1.byDefaultSetServicePrior(document._id),
					// eligibiltyCheckMapperV1.checkCOI(document._id, doc.respondentState),
					eligibiltyCheckMapperV1.checkInitiatingParty(document._id, doc.initiatingParty),
					eligibiltyCheckMapperV1.checkTaxIdentifierNumberTaxID(document._id, doc.taxIdentifierNumberTaxID),
					eligibiltyCheckMapperV1.checkNationalProviderIdentifierNPI(document._id, doc.nationalProviderIdentifierNPI),
					eligibiltyCheckMapperV1.checkOpenNegotiation(document._id, doc.openNegotiationPeriodStartDate),
					eligibiltyCheckMapperV1.checkPartiesInfo(document._id, doc),
					eligibiltyCheckMapperV1.checkLineItemsInfo(document._id, doc.disputeLineItems),
					eligibiltyCheckMapperV1.checkIDRENegotiation(document._id, doc.openNegotiationPeriodStartDate, doc.complainantAttestationDate, checkIdredata)
				]);

				const bulkWriteOperations = [
					byDefaultSetServicePrior,
					// checkCOI,
					checkInitiatingParty,
					checkTaxIdentifierNumberTaxID,
					checkNationalProviderIdentifierNPI,
					checkOpenNegotiation,
					checkPartiesInfo,
					...checkLineItemsInfo,
					checkIDRENegotiation
				].filter(operation => operation !== undefined);

				//const hasSelectionResponse = fetchFiles.some(file => file.type === "SELECTION_RESPONSE");
					const bifurcatedState = await redisClient.getValue(`${REDIS_PREFIX.NAME}.${document._id}.${REDIS_SUFFIX.BIFURCATED_STATE}`);
					const messageData = {
						...doc,
						"files": fetchFiles,
						disputeId: document._id,
						adminId: adminId,
						bifurcatedState: bifurcatedState
					}
					await kafkaProducerObjection.sendResponse(JSON.stringify(messageData), KAFKA_TOPICS_PRODUCER.OBJECTION_REQUEST)
					await redisClient.setExp(
						`${REDIS_PREFIX.NAME}.${document._id.toString()}`,
						SERVER.TOKEN_INFO.EXPIRATION_TIME.OPERATIONS / 1000,
						JSON.stringify(bulkWriteOperations)
					);
				// }else{
				// 	await baseDao.bulkWrite(this.modelEligible, bulkWriteOperations);
				// 	//remaining for dispute conclusion
				// 	await eligibiltyCheckDaoV1.disputeConclusionWithoutObjection(document._id)
				// }
			}

			return MESSAGES.SUCCESS.DEFAULT


		} catch (error) {
			await baseDao.updateOne(this.modelIdreCases, { disputeId: toObjectId(document._id) }, { $set: { status: DISPUTE_STATUS.RE_CHECK } }, {})
			redisClient.removeToSortedSet(REDIS.DISPUTE, document._id)
			console.error('Error in eligibility check: ', error)
		}
	}

	/**
	 * @author Chitvan Baish
	 * @function updateDisputeStatus
	 * @description This function will update the dispute status one by one
	 */
	async updateDisputeStatus(disputeId, status, CHECK_LIST, proceed = true, lineItemNo?: number) {
		try {
			const query = {
				disputeId: toObjectId(disputeId),
				name: CHECK_LIST.NAME
			};

			const update: any = {
				$set: { status: status, proceed: proceed, name: CHECK_LIST.NAME, statement: CHECK_LIST.STATEMENT }
			};

			if (lineItemNo) {
				update.$set.lineItemNo = lineItemNo;
			}

			return await baseDao.updateOne(this.modelEligible, query, update, { upsert: true });
		} catch (error) {
			throw error;
		}
	}



	/**
	 * @function calculateBusinessDays
	 * @author Chitvan Baish
	 * @param startDate
	 * @param endDate
	 * @description function will calculate the business days with including holidays
	 */
	async calculateBusinessDays(startDate, endDate, data?) {
		try {
			// let start = moment(startDate, 'YYYY-MM-DD');
			let start = moment(startDate, DATE_PATTERN, true);
			let end = moment(endDate, 'YYYY-MM-DD');

			console.log(start, 'startDate: ', startDate, 'endDate: ', endDate, 'end:', end)

			// Ensure start date is before or equal to end date
			if (start.isAfter(end)) {
				console.error("Start date must be before or equal to end date.");
				return -1;
			}

			// Move start date to the next business day if it is not a business day
			if (!start.isBusinessDay()) {
				start = start.nextBusinessDay();
			}

			// Calculate the number of business days between the start and end dates
			let businessDaysCount = start.businessDiff(end) + (start.isBusinessDay() ? 1 : 0);
			// let businessDaysCount = end.businessDiff(start);
			let startTimestamp = start.unix() * 1000;
			let endTimestamp = end.unix() * 1000;

			const modelHoliday: any = DB_MODEL_REF.HOLIDAYS
			const match = {
				date: { $gte: startTimestamp, $lte: endTimestamp },
				status: STATUS.UN_BLOCKED,
				day: DAY.WEEKDAY
			}
			const holidayCount = await baseDao.countDocuments(modelHoliday, match)
			let calculateExtension = 0

			// if(data.submissionWindowExpiredReason == SUBMISSION_WINDOW.APPROVED_EXTENSION || data.submissionWindowExpiredReason == SUBMISSION_WINDOW.TMA_EXTENSION){
			// 	data.startDate = startTimestamp;
			// 	data.endDate = endTimestamp;
			// 	calculateExtension = await this.calculateExtension(data)
			// }

			console.log(holidayCount, startTimestamp, endTimestamp)
			const totalBusinessDays = businessDaysCount - holidayCount
			return totalBusinessDays;
		} catch (error) {
			throw error
		}
	}


	/**
	 * @function caseManagementList
	 * @author Chitvan Baish
	 * @description function will give the list of all cases
	 */
	async caseManagementList(params: EligibiltyCheckRequest.List, tokenData: TokenData) {
		try {
			const result = await eligibiltyCheckDaoV1.caseManagementList(params, tokenData);
			return MESSAGES.SUCCESS.DETAILS(result)
		} catch (error) {
			throw error
		}
	}

	/**
	 * @function caseManagementMyList
	 * @author Chitvan Baish
	 * @description function will give the list of my cases
	 */
	async caseManagementMyList(params: EligibiltyCheckRequest.List, tokenData: TokenData) {
		try {
			const result = await eligibiltyCheckDaoV1.caseManagementMyList(params, tokenData);
			if (params.isExport) {
				return MESSAGES.SUCCESS.DOWNLOAD_FILE
			}
			else {
				return MESSAGES.SUCCESS.DETAILS(result)
			}
		} catch (error) {
			throw error
		}
	}

	/**
	 * @function caseManagementUnassignedList
	 * @author Chitvan Baish
	 * @description function will give the list of my cases
	 */
	async caseManagementUnassignedList(params: EligibiltyCheckRequest.List, tokenData: TokenData) {
		try {
			const result = await eligibiltyCheckDaoV1.caseManagementUnassignedList(params, tokenData);
			if (params.isExport) {
				return MESSAGES.SUCCESS.DOWNLOAD_FILE
			}
			else {
				return MESSAGES.SUCCESS.DETAILS(result)
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
			const result = await eligibiltyCheckDaoV1.caseManagementAssignedList(params, tokenData);
			if (params.isExport) {
				return MESSAGES.SUCCESS.DOWNLOAD_FILE
			}
			else {
				return MESSAGES.SUCCESS.DETAILS(result)
			}
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
	async myDisputeFiles(params: EligibiltyCheckRequest.Details, tokenData: TokenData) {
		try {
			const isDisputeExist = await eligibiltyCheckDaoV1.isDisputeExist(params.disputeId);
			if (!isDisputeExist) return Promise.reject(MESSAGES.ERROR.DISPUTE_NOT_EXIST)

			let result = await eligibiltyCheckDaoV1.myDisputeFiles(params);
			result = result ? result : { files: [] };
			return MESSAGES.SUCCESS.DISPUTE_DETAILS(result)
		} catch (error) {
			throw error
		}
	}


	/**
	 * @function eligibilityCheckList
	 * @author Chitvan Baish
	 * @param disputeId
	 * @description function will give the list of eligibility outreach checks
	 */
	async eligibilityCheckList(params: EligibiltyCheckRequest.Details, tokenData: TokenData) {
		try {
			const isDisputeExist = await eligibiltyCheckDaoV1.isDisputeExist(params.disputeId);
			if (!isDisputeExist) return Promise.reject(MESSAGES.ERROR.DISPUTE_NOT_EXIST)

			const result = await eligibiltyCheckDaoV1.eligibilityCheckList(params);
			return MESSAGES.SUCCESS.DISPUTE_DETAILS(result)
		} catch (error) {
			throw error
		}
	}

	/**
	 * @function eligibilityOutreachCheckList
	 * @author Chitvan Baish
	 * @param disputeId
	 * @description function will give the list of eligibility checks
	 */
	async eligibilityOutreachCheckList(params: EligibiltyCheckRequest.Details, tokenData: TokenData) {
		try {
			const isDisputeExist = await eligibiltyCheckDaoV1.isDisputeExist(params.disputeId);
			if (!isDisputeExist) return Promise.reject(MESSAGES.ERROR.DISPUTE_NOT_EXIST)

			const result = await eligibiltyCheckDaoV1.eligibilityOutreachCheckList(params);
			return MESSAGES.SUCCESS.DISPUTE_DETAILS(result)
		} catch (error) {
			throw error
		}
	}

	/**
	 * @function eligibilityObjectionCheckList
	 * @author Chitvan Baish
	 * @param disputeId
	 * @description function will give the list of eligibility checks
	 */
	async eligibilityObjectionCheckList(params: EligibiltyCheckRequest.Details, tokenData: TokenData) {
		try {
			const isDisputeExist = await eligibiltyCheckDaoV1.isDisputeExist(params.disputeId);
			if (!isDisputeExist) return Promise.reject(MESSAGES.ERROR.DISPUTE_NOT_EXIST)

			const result = await eligibiltyCheckDaoV1.eligibilityObjectionCheckList(params);
			return MESSAGES.SUCCESS.DISPUTE_DETAILS(result)
		} catch (error) {
			throw error
		}
	}


	/**
	 * @author Chitvan Baish
	 * @function rescan
	 * @param disputeId
	 * @description Function to rescan the dispute and handle the necessary updates.
	 */
	async rescan(params: { disputeId: string }, tokenData: TokenData) {
		try {
			const { disputeId } = params;
			// const disputeRedisKey = `${REDIS_PREFIX.NAME}.${disputeId}.${REDIS_SUFFIX.RESCAN}`;
			// const [disputeListLength, disputeRedisValue, disputeInProgress] = await Promise.all([
			// 	redisClient.sortedListLength(REDIS.DISPUTE),
			// 	redisClient.getValue(disputeRedisKey),
			// 	redisClient.getValue(`${REDIS_PREFIX.NAME}.${params.disputeId}`)
			// ]);;
			// if (disputeInProgress || disputeRedisValue) {
			// 	return Promise.reject(MESSAGES.ERROR.RESCAN_INPROGRESS({ queue: disputeListLength }));
			// }

			const disputeListLength = await redisClient.sortedListLength(REDIS.DISPUTE)
			const disputeInProgress = await baseDao.findOne(this.modelIdreCases,{status:DISPUTE_STATUS.IN_PROGRESS,disputeId:toObjectId(disputeId)});
			if(disputeInProgress) return Promise.reject(MESSAGES.ERROR.RESCAN_INPROGRESS({ queue: disputeListLength }))
			const model: any = DB_MODEL_REF.DISPUTES;
			const match = { _id: toObjectId(disputeId) };
			const doc = await baseDao.findOne(model, match);

			// Handle case where the dispute does not exist
			if (!doc) {
				return Promise.reject(MESSAGES.ERROR.DISPUTE_NOT_EXIST);
			}

			// Fetch files from S3 based on dispute number
			const fetchFiles = await this.fetchFiles(doc.dispute.disputeNumber);
			const updateFiles = {
				$set: {
					files: fetchFiles,
					drn: doc.dispute.disputeNumber,
				},
			};
			console.log(REDIS.DISPUTE, Date.now(), params.disputeId)

			// Update the dispute files and check eligibility criteria
			await Promise.all([
				baseDao.updateOne(this.modelIdreCasesFile, { disputeId: toObjectId(disputeId) }, updateFiles, { upsert: true }),
				this.commonEligibiltyCriteriaCheck(doc, fetchFiles, tokenData.userId),
				// redisClient.setExp(disputeRedisKey, SERVER.TOKEN_INFO.EXPIRATION_TIME.RESCAN / 1000, doc.dispute.disputeNumber),
				redisClient.addToSortedSet(REDIS.DISPUTE, Date.now(), String(params.disputeId))
			]);

			// Log activity
			const activityDate = {
				description: `@${tokenData.userId} sync the dispute`,
				adminId: toObjectId(tokenData.userId),
				disputeId: toObjectId(disputeId),
			};
			activityControllerV1.addActivity(activityDate);

			if (disputeListLength) {
				return MESSAGES.SUCCESS.RESCAN({ queue: disputeListLength })
			}
			else {
				return MESSAGES.SUCCESS.RESCAN_SUCCESSFULLY({ queue: disputeListLength })
			}

		} catch (error) {
			// Log and rethrow the error
			console.error('Error in rescan:', error);
			redisClient.removeToSortedSet(REDIS.DISPUTE, params.disputeId)
			eligibiltyCheckDaoV1.sendMailDisputeFail(params, tokenData)
			throw error;
		}
	}



	/**
	 * @author Chitvan Baish
	 * @function disputeDetails
	 * @param disputeId
	 * @description Function to give the details of dispute
	 */
	async disputeDetails(params, tokenData) {
		try {
			const isDisputeExist = await eligibiltyCheckDaoV1.isDisputeExist(params.disputeId);
			if (!isDisputeExist) return Promise.reject(MESSAGES.ERROR.DISPUTE_NOT_EXIST)

			const result = await eligibiltyCheckDaoV1.disputeDetails(params, tokenData);
			const activityDate = {
				description: `@${tokenData.userId} viewed this ${isDisputeExist.dispute.disputeNumber}`,
				adminId: toObjectId(tokenData.userId),
				disputeId: toObjectId(isDisputeExist._id)
			}
			activityControllerV1.addActivity(activityDate)
			return MESSAGES.SUCCESS.DETAILS(result)
		} catch (error) {
			throw error
		}
	}

	/**
	 * @author Chitvan Baish
	 * @function fetchFiles
	 * @param folderName
	 * @description This function will fetch the files from aws s3
	 */
	async fetchFiles(folderName: string) {
		try {
			AWS.config.update({
				accessKeyId: SERVER.S3.FILE_ACCESS_KEY_ID,
				secretAccessKey: SERVER.S3.FILE_SECRET_ACCESS_KEY,
				region: SERVER.S3.AWS_REGION,
			});

			const s3 = new AWS.S3();
			const s3Cred = {
				Bucket: SERVER.S3.S3_FILE_BUCKET_NAME,
				// Prefix: folderName.endsWith('/') ? folderName : `${folderName}/`, // Ensure folderName ends with '/'
				Prefix: `${folderName}/`,
			};
			const match = { drn: folderName };
			let cases = await baseDao.findOne(this.modelIdreCasesFile, match, { files: 1 });
			let uploadedPdfs = [];
			const data = await s3.listObjectsV2(s3Cred).promise();
			if (data.Contents) {
				const baseUrl = SERVER.S3.FILE_BUCKET_URL;

				// Map and sort files by LastModified date
				const files: any = data.Contents.map(item => ({
					name: item.Key?.replace(s3Cred.Prefix, "") || "",
					url: baseUrl + encodeURIComponent(item.Key || ""), // Encode the file name
					lastModified: item.LastModified || new Date()
				})).sort((a, b) => a.lastModified.getTime() - b.lastModified.getTime());
				if (cases?.files.length !== files.length) {
					if (!cases?.files.length) cases = { files: [] }
					// Filter eml and msg files
					const emailFiles = files.filter(file => {
						const ext = file.name.split('.').pop().toLowerCase();
				
						const isValidExtension = ext === FILE_EXTENTION.EML || 
												 ext === FILE_EXTENTION.MSG || 
												 ext === FILE_EXTENTION.DOC || 
												 ext === FILE_EXTENTION.DOCX || 
												 ext === FILE_EXTENTION.TXT;
						const isFileInCases = cases.files.some(c => c.name === file.name);
						return isValidExtension && !isFileInCases;
					});

					let response: any = [];
					for (const emailFile of emailFiles) {
						console.log(`Converting file: ${emailFile.url}`);
						try {
							const ext = emailFile.name.split('.').pop().toLowerCase();
							if(ext === FILE_EXTENTION.EML || ext === FILE_EXTENTION.MSG){
								response = await this.processEmailFile(emailFile.url, emailFile.name); // convert the .msg and .eml file to pdf
							}
							else if(ext === FILE_EXTENTION.DOC || ext === FILE_EXTENTION.DOCX || ext === FILE_EXTENTION.TXT){
								response = await this.convertFileToPdf(emailFile.url, emailFile.name);
							}
							console.log("Converted files", response);
							response.forEach(uploadedPdf => {
								const isAlreadyInFiles = cases.files.some(existingFile => existingFile.name === uploadedPdf.name);
								if (!isAlreadyInFiles) {
									uploadedPdfs.push(uploadedPdf);  // Push only if not already present
								}
							});
							console.log(`Conversion successful for: ${emailFile.url}`);
						} catch (error) {
							console.error(`Error converting file: ${emailFile.url}`, error);
						}
					}
					// cases.files.push(...uploadedPdfs);
					// Check for gaps larger than 1 hour
					const oneHourInMillis = 60 * 60 * 1000;
					let lastModifiedTime: Date | null = null;

					const result = files.map(file => {
						let fileType = "";

						if (/IDR(?:NoticeOfInitiation|_-_Notice_-_Of_-_Initiation| Notice Of Initiation|_Notice_Of_Initiation)/i.test(file.name)) {
							fileType = 'IDRNOTICE';
						} else if (/Selection(?: Response|_-_Response|_Response|Response)/i.test(file.name) &&
							!/Reselection Response/i.test(file.name)) { // Exclude "Reselection Response"
							fileType = 'SELECTION_RESPONSE';
						} else if (/\bPRA\b/i.test(file.name)) { // Match "PRA" with delimiters or as standalone term
							fileType = 'PRA';
						} else if (/\bEOB\b/i.test(file.name)) { // Match "EOB" with delimiters or as standalone term
							fileType = 'EOB';
						} else if (/\DLI\b/i.test(file.name)) { // Match "EOB" with delimiters or as standalone term
							fileType = 'DLI';
						}

						if (lastModifiedTime && (file.lastModified.getTime() - lastModifiedTime.getTime() > oneHourInMillis)) {
							fileType = "OUTREACH"; // Mark file type as OUTREACH if gap > 1 hour
						}

						const ext = file.name.split('.').pop().toLowerCase();

						lastModifiedTime = file.lastModified;

						return {
							...file,
							type: fileType,
							extension: ext
						};
					});
					return result.concat(...uploadedPdfs);
				}
				return cases.files
			}

			return [];
		} catch (error) {
			console.error('Error fetching files from S3:', error);
			throw error;
		}
	}

	/**
	 * @author Chitvan Baish
	 * @function activityLog
	 * @param disputeId
	 * @description This function will give the activities list
	 */
	async activityLog(params: EligibiltyCheckRequest.Details, tokenData: TokenData) {
		try {
			const isDisputeExist = await eligibiltyCheckDaoV1.isDisputeExist(params.disputeId);
			if (!isDisputeExist) return Promise.reject(MESSAGES.ERROR.DISPUTE_NOT_EXIST)

			const result = await eligibiltyCheckDaoV1.activityLog(params, tokenData);
			return MESSAGES.SUCCESS.DISPUTE_ACTIVITY_LOG(result);

		} catch (error) {
			throw error
		}
	}


	//   async coolingOff(params){
	//     const model:any = DB_MODEL_REF.DISPUTES
	//     const step1 = await baseDao.findOne(model,{_id:toObjectId(params.disputeId)})
	//     const bulkWriteOperations = await eligibiltyCheckMapperV1.checkIDRWithCoolingOffDate(step1._id,step1.dispute,params)
	//     await baseDao.bulkWrite(this.modelEligible, bulkWriteOperations);
	//     return MESSAGES.SUCCESS.DEFAULT
	//   }


	/**
	 * @author Chitvan Baish
	 * @function calculateReviewDate
	 * @param startDate
	 * @description This function will calculate the review date
	 */
	async calculateReviewDate(startDate: string) {
		try {
			const model: any = DB_MODEL_REF.HOLIDAYS
			const start = moment.utc(startDate, 'YYYY-MM-DD');
			// Add 30 business days to the start date
			let futureDate = start.businessAdd(30);
			const startTimestamp = start.unix() * 1000;
			const endTimestamp = futureDate.unix() * 1000;
			const match = {
				date: { $gte: startTimestamp, $lte: endTimestamp },
				status: STATUS.UN_BLOCKED,
				day: DAY.WEEKDAY
			}
			const calculateHolidays = await baseDao.countDocuments(model, match)
			// const calculateHolidays = await baseDao.countDocuments(model, { date: { $gte: startTimestamp, $lte: endTimestamp } })
			if (calculateHolidays) {
				futureDate = futureDate.businessAdd(calculateHolidays)
			}
			return futureDate;

		} catch (error) {
			throw error
		}
	}

	/**
	 * @author Chitvan Baish
	 * @function assignNewUser
	 * @description This function will assign new user
	 */
	async assignNewUser(params: EligibiltyCheckRequest.Assign, tokenData: TokenData) {
		try {
			const isAdminExist = adminDaoV1.isAdminExist(params.adminId);
			if (!isAdminExist) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN)
			const result = await eligibiltyCheckDaoV1.assignNewUser(params, tokenData)
			return MESSAGES.SUCCESS.ASSIGNED_CASE(result)
		} catch (error) {
			throw error
		}
	}

	/**
	 * @author Chitvan Baish
	 * @function unAssignUser
	 * @param disputeId
	 * @description This function will un-assign user
	 */
	async unAssignUser(params: EligibiltyCheckRequest.UnAssign, tokenData: TokenData) {
		try {
			const result = await eligibiltyCheckDaoV1.unAssignUser(params, tokenData)
			return MESSAGES.SUCCESS.UNASSIGN_USER
		} catch (error) {
			throw error
		}
	}


	//testing download attachement from eml and .msg extension
	async downloadFile(url) {
		try {
			// console.log(url);
			// const response = await axios.get(url, { responseType: 'arraybuffer' });
			// return response.data;
			const agent = new https.Agent({ rejectUnauthorized: false });
			const response = await axios.get(url, {
				responseType: 'arraybuffer',
				httpsAgent: agent,
				headers: {
					// Optional headers if needed for S3 access
					'Accept': '*/*',
				}
			});
        return response.data;
		}
		catch (error) {
			console.log("Error in downloadFile from s3", error);
			throw error;
		}
	}


	async parseEmail(buffer) {
		return await simpleParser(buffer);
	}

	async extractDispIdFromUrl(url) {
		const match = url.match(/DISP-\d+/);
		return match ? match[0] : null;
	}

	/**
	 * @function convertToHtml
	 * @description this function convert doc, docx and txt files to html
	 * @returns html content data
	 */
	async convertToHtml(fileBuffer, fileType){
		try {
			let htmlContent = '';

			if (fileType === FILE_EXTENTION.DOCX || fileType === FILE_EXTENTION.DOC) {
				const result = await mammoth.convertToHtml({ buffer: fileBuffer });
				htmlContent = result.value; 
			} else if (fileType === FILE_EXTENTION.TXT) {
				const textContent = fileBuffer.toString('utf-8');
				htmlContent = `<pre>${textContent}</pre>`;
			} else {
				throw new Error('Unsupported file type for HTML conversion');
			}

			return htmlContent; // Return HTML content
		} catch (error) {
			console.error('Error converting file to HTML:', error);
			throw error;
		}
	}

	/**
	 * @function convertFileToPdf
	 * @description this function convert html to pdf
	 * @returns pdf buffer data
	 */
	async convertFileToPdf(fileUrl, name) {
		try{
			const dispId = await this.extractDispIdFromUrl(fileUrl);
			if (!dispId) throw new Error('DISP ID not found in URL');

			const fileExtension = name.split('.').pop().toLowerCase();
			const fileName = path.parse(name).name;
			const fileBuffer = await this.downloadFile(fileUrl);

			const browser = await puppeteer.launch({
				// headless: true, // Ensure headless mode
				// args: ['--no-sandbox', '--disable-setuid-sandbox'],
				// executablePath: '/usr/bin/chromium-browser',
				// timeout: 0 // Disable timeout for the launch
			});
			const page = await browser.newPage();
			const htmlContent = await this.convertToHtml(fileBuffer, fileExtension); // Function to convert file content to HTML
    		await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
			
			const pdfBuffer = await page.pdf({ format: 'A4' });
		
			await browser.close();
		
			const pdfFileName = `${dispId}/${fileName}.pdf`;
			await this.uploadToS3(SERVER.S3.S3_FILE_BUCKET_NAME, pdfFileName, pdfBuffer); // Function to handle PDF upload to S3
			const data = []
			data.push({
				name: fileName,
				url: `${SERVER.S3.FILE_BUCKET_URL}${pdfFileName}`,
				type: "",
				reference: name,
				extension: FILE_EXTENTION.PDF
			});
			return data; // Return the converted PDF file details
		}
		catch(error){
			console.log("Error in docx conversion: ", error);
			throw error;
		}
	}
	

	/**
	 * @function createPdfFromEmail
	 * @description this function convert html to pdf
	 * @returns pdf buffer data
	 */
	async createPdfFromEmail(email) {
		try {
			const browser = await puppeteer.launch({
				// headless: true, // Ensure headless mode
				// args: ['--no-sandbox', '--disable-setuid-sandbox'],
				// executablePath: '/usr/bin/chromium-browser',
				// timeout: 0 // Disable timeout for the launch
			});
			const page = await browser.newPage();

			await page.setContent(email.html);
			const pdfBuffer = await page.pdf({
				format: 'A4',
				printBackground: true
			});
			await browser.close();

			return pdfBuffer;
		}
		catch (error) {
			console.log("Error in createPdfFromEmail", error);
			throw error;
		}
	}

	/**
	 * @function convertTextToPdf
	 * @description this function convert text data into pdf
	 * @returns pdf buffer data
	 */
	async convertTextToPdf(text) {
		try {
			const browser = await puppeteer.launch({
				// headless: true, // Ensure headless mode
				// args: ['--no-sandbox', '--disable-setuid-sandbox'],
				// executablePath: '/usr/bin/chromium-browser',
				// timeout: 0 // Disable timeout for the launch
			});
			const page = await browser.newPage();

			const htmlContent = `<pre>${text}</pre>`;
			await page.setContent(htmlContent);

			const pdfBuffer = await page.pdf({
				format: 'A4',
				printBackground: true,
				margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
			});

			await browser.close();
			return pdfBuffer;
		}
		catch (error) {
			console.log("Error in convertTextToPdf", error);
			throw error;
		}
	}

	/**
	 * @function uploadToS3
	 * @description this function uploads the files to s3
	 */
	async uploadToS3(bucketName, key, buffer) {
		AWS.config.update({
			accessKeyId: SERVER.S3.FILE_ACCESS_KEY_ID,
			secretAccessKey: SERVER.S3.FILE_SECRET_ACCESS_KEY,
			region: SERVER.S3.AWS_REGION,
		});
		const s3 = new AWS.S3();
		const params = {
			Bucket: bucketName,
			Key: key,
			Body: buffer
		};
		await s3.upload(params).promise();
	}

	/**
	 * @function parseMsgEmail
	 * @description this function parse msg file to buffer data
	 * @returns buffer data of of pdf
	 */
	async parseMsgEmail(fileBuffer) {
		try {
			const reader = new MsgReader(fileBuffer);
			const msg = reader.getFileData(); // Extract the email data

			const htmlBody = msg.body;
			const attachments = await Promise.all(msg.attachments.map(async (att) => {
				const attachmentContent: any = await reader.getAttachment(att);
				return {
					filename: attachmentContent.fileName,
					content: attachmentContent.content // Convert content to Buffer
				};
			}));
			const pdfBuffer = await this.convertTextToPdf(htmlBody);

			return { pdfBuffer, attachments };
		}
		catch (error) {
			console.log("Error in parseMsgEmail", error);
			throw error;
		}
	}

	/**
	 * @function processEmailFile
	 * @description This function converts .eml and .msg files into PDFs and uploads them to S3.
	 * @returns converted pdf files
	 */
	async processEmailFile(s3Url, name) {
		try {
			const dispId = await this.extractDispIdFromUrl(s3Url);
			if (!dispId) throw new Error('DISP ID not found in URL');

			const fileExtension = path.extname(s3Url).toLowerCase();
			const fileName = path.parse(name).name;
			const fileBuffer = await this.downloadFile(s3Url);
			const data = []
			if (fileExtension === '.eml') {
				const email = await this.parseEmail(fileBuffer);
				const pdfBuffer = await this.createPdfFromEmail(email);
				const pdfKey = `${dispId}/email_${fileName}.pdf`;
				console.log(`${SERVER.S3.FILE_BUCKET_URL}${pdfKey}`)
				data.push({
					name: `email_${fileName}.pdf`,
					url: `${SERVER.S3.FILE_BUCKET_URL}${pdfKey}`,
					type: "",
					reference: name,
					extension: FILE_EXTENTION.PDF
				})
				await this.uploadToS3(SERVER.S3.S3_FILE_BUCKET_NAME, pdfKey, pdfBuffer);

				if (email.attachments && email.attachments.length > 0) {
					for (let attachment of email.attachments) {
						const attachmentKey = `${dispId}/${attachment.filename}`;
						console.log("###########", `${SERVER.S3.FILE_BUCKET_URL}${attachmentKey}`);
						data.push({
							name: attachment.filename,
							url: `${SERVER.S3.FILE_BUCKET_URL}${attachmentKey}`,
							type: "",
							reference: name,
							extension: attachment.filename.split('.').pop().toLowerCase()
						})
						await this.uploadToS3(SERVER.S3.S3_FILE_BUCKET_NAME, attachmentKey, attachment.content);
					}
				}
			}
			else {
				const content = await this.parseMsgEmail(fileBuffer);
				const pdfBuffer = content.pdfBuffer;
				const email = content.attachments;
				const pdfKey = `${dispId}/email_${fileName}.pdf`;
				console.log(`${SERVER.S3.FILE_BUCKET_URL}${pdfKey}`)
				data.push({
					name: `email_${fileName}.pdf`,
					url: `${SERVER.S3.FILE_BUCKET_URL}${pdfKey}`,
					type: "",
					reference: name,
					extension: FILE_EXTENTION.PDF
				})
				await this.uploadToS3(SERVER.S3.S3_FILE_BUCKET_NAME, pdfKey, pdfBuffer);

				if (email && email.length > 0) {
					for (let attachment of email) {
						const attachmentKey = `${dispId}/${attachment.filename}`;
						console.log("###########", `${SERVER.S3.FILE_BUCKET_URL}${attachmentKey}`);
						data.push({
							name: attachment.filename,
							url: `${SERVER.S3.FILE_BUCKET_URL}${attachmentKey}`,
							type: "",
							reference: name,
							extension: attachment.filename.split('.').pop().toLowerCase()
						})
						await this.uploadToS3(SERVER.S3.S3_FILE_BUCKET_NAME, attachmentKey, attachment.content);
					}
				}
			}
			console.log('PDF and attachments uploaded successfully');
			return data;
		} catch (error) {
			console.error('Error processing email file:', error);
		}
	}

	/**
	 * @author Chitvan Baish
	 * @function reAssignUser
	 * @description This function will re-assign users
	 */
	async reAssignUser(params: EligibiltyCheckRequest.Assign, tokenData: TokenData) {
		try {
			const isAdminExist = adminDaoV1.isAdminExist(params.adminId);
			if (!isAdminExist) return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN)
			const result = await eligibiltyCheckDaoV1.reAssignUser(params, tokenData)
			return MESSAGES.SUCCESS.REASSIGNED_CASE(result)
		} catch (error) {
			throw error
		}
	}


	async deleteDuplicateRecords() {
		return await eligibiltyCheckDaoV1.updateDisputeTime()
	}

	async calculateExtension(params) {
		try {
			const model: any = DB_MODEL_REF.EXTENSION;
			const modelHoliday: any = DB_MODEL_REF.HOLIDAYS;
	
			// IP Check
			const ipCheck = {
				$or: [
					{ 
						$and: [ 
							{ ipName: { $in: [params.ipName] } }, 
							{ ipType: "NOT_ALL" }
						] 
					},
					{ 
						$and: [ 
							{ ipName: { $nin: [params.ipName] } }, 
							{ ipType: "ALL" }
						] 
					}
				]
			};
	
			// NIP Check
			const nipCheck = {
				$or: [
					{ 
						$and: [ 
							{ nipName: { $in: [params.nipName] } }, 
							{ nipType: "NOT_ALL" }
						] 
					},
					{ 
						$and: [ 
							{ nipName: { $nin: [params.nipName] } }, 
							{ nipType: "ALL" }
						] 
					}
				]
			};
	
			// State Check: only add if params.state exists
			const stateCheck = params.state
				? { stateName: { $in: params.state } }
				: {};
	
			// Combined filter for documents
			const filter = {
				status: STATUS.UN_BLOCKED,
				day: DAY.WEEKDAY,
				startDate: { $gte: params.startDate, $lte: params.endDate },
				$or: [
					{ 
						$and: [ipCheck, stateCheck], // Pass IP and State
					},
					{ 
						$and: [stateCheck, nipCheck], // Pass State and NIP
					}
				]
			};
	
			// Log the final filter before query execution
			console.log("Final Filter: ", JSON.stringify(filter, null, 2));
	
			// Count distinct documents by startDate using aggregation
			const distinctCount = await baseDao.aggregate(model,[
				{ $match: filter },
				{ $group: { _id: "$startDate", count: { $sum: 1 } } },
				{ $count: "totalCount" }
			]);
	
			const calculateExtension = distinctCount.length > 0 ? distinctCount[0].totalCount : 0;
			console.log("Count result: ", calculateExtension); // Debugging output for result count
	
			// Prepare match for holidays
			const match = {
				date: { $gte: params.startDate, $lte: params.endDate },
				status: STATUS.UN_BLOCKED,
				day: DAY.WEEKDAY
			};
	
			// Count holidays
			const calculateHolidays = await baseDao.countDocuments(modelHoliday, match);
	
			// Calculate final result
			if(calculateExtension > 0){
				return Math.max(0, calculateExtension - calculateHolidays);
			}else {
				return calculateExtension
			}
	
		} catch (error) {
			throw error;
		}
	}

	async mannualRefresh() {
		try {
			const match = {};
			const { LAST_SCAN}: {
				LAST_SCAN: any,
			} = DB_MODEL_REF;
			
			// Fetch the latest scan date
			const step1 = await baseDao.findOne(LAST_SCAN, match, { lastScanDate: 1 }, {}, { created: -1 });
			const query = step1 ? { updatedAt: { $gt: step1.lastScanDate } } : {};
			const totalUpdateDispute = await disputes.count(query);
			
			


		} catch (error) {
			throw error
		}
	}
	
	
	
	


}

export const eligibiltyCheckController = new EligibiltyCheckController();

