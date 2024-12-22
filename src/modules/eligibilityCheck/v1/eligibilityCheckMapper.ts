import { DB_MODEL_REF, DISPUTE_STATUS, REDIS_PREFIX, REDIS_SUFFIX } from "@config/constant";
import { CHECK_LIST, COI_STATES, DATE_PATTERN, KAFKA_OBJECTION, OBJECTION, OBJECTION_REASON, PARTIES_INFO, SERVICE_DATE, STATE_NAMES, STATES, SUBMISSION_WINDOW } from "../eligibilityConstants";
import { eligibiltyCheckControllerV1, eligibiltyCheckDaoV1 } from "..";
import { toObjectId } from "@utils/appUtils";
import { BaseDao } from "@modules/baseDao/BaseDao";
import * as moment from 'moment';
import { redisClient } from "@lib/index";
import { SERVER } from "@config/environment";

export class EligibiltyCheckMapper extends BaseDao {

  public modelEligible: any = DB_MODEL_REF.ELIGIBILITY_CHECK

  async byDefaultSetServicePrior(disputeId: string) {
    try {
      const update = {
        updateOne: {
          filter: {
            disputeId: toObjectId(disputeId),
            name: CHECK_LIST.SERVICE_PRIOR.NAME
          },
          update: {
            $set: { status: DISPUTE_STATUS.ELIGIBLE, name: CHECK_LIST.SERVICE_PRIOR.NAME, statement: CHECK_LIST.SERVICE_PRIOR.STATEMENT, value: { reason: "No" } }
          },
          upsert: true
        }
      }
      return update;
    } catch (error) {
      throw error
    }
  }
  async checkWaiveSurpriseBillingProtections(disputeId: string, waiveSurpriseBillingProtections: string) {
    try {
      const match = { disputeId: toObjectId(disputeId), name: CHECK_LIST.SERVICE_PRIOR.NAME }
      const data = await this.findOne(this.modelEligible, match)
      let proceed: boolean
      // (waiveSurpriseBillingProtections != 'No') ? status = DISPUTE_STATUS.NOT_ELIGIBLE : status = DISPUTE_STATUS.ELIGIBLE
      let status = (waiveSurpriseBillingProtections != 'No') ? (proceed = false, DISPUTE_STATUS.NOT_ELIGIBLE) : (proceed = true, DISPUTE_STATUS.ELIGIBLE);
      const update = {
        updateOne: {
          filter: {
            disputeId: toObjectId(disputeId),
            name: CHECK_LIST.SERVICE_PRIOR.NAME
          },
          update: {
            $set: { status: status, proceed: proceed, name: CHECK_LIST.SERVICE_PRIOR.NAME, statement: CHECK_LIST.SERVICE_PRIOR.STATEMENT, value: { "reason": waiveSurpriseBillingProtections } }
          },
          upsert: true
        }
      }
      return update;
      // await eligibiltyCheckControllerV1.updateDisputeStatus(disputeId, status, CHECK_LIST.SERVICE_PRIOR, proceed)
    } catch (error) {
      throw error
    }
  }

  async checkTaxIdentifierNumberTaxID(disputeId: string, taxIdentifierNumberTaxID: string) {
    try {
      const existingStatus = await this.findOne(
        this.modelEligible,
        { disputeId: toObjectId(disputeId), name: CHECK_LIST.TAXID.NAME },
        { status: 1 }
      );

      let status: string, value;
      if (!taxIdentifierNumberTaxID) {
        status = DISPUTE_STATUS.OUTREACH;
        value = {
          reason: "Yes"
        }
      } else if (existingStatus) {
        status = DISPUTE_STATUS.ELIGIBLE;
        value = {
          reason: "No"
        }
      }

      if (status) {
        const update = {
          updateOne: {
            filter: {
              disputeId: toObjectId(disputeId),
              name: CHECK_LIST.TAXID.NAME
            },
            update: {
              $set: {
                status: status,
                name: CHECK_LIST.TAXID.NAME,
                statement: CHECK_LIST.TAXID.STATEMENT,
                value: value,
                outreachVar:true
              }
            },
            upsert: true
          }
        };
        return update;
      }
    } catch (error) {
      throw error;
    }
  }


  async checkNationalProviderIdentifierNPI(disputeId: string, nationalProviderIdentifierNPI: string) {
    try {
      const existingStatus = await this.findOne(
        this.modelEligible,
        { disputeId: toObjectId(disputeId), name: CHECK_LIST.NPI.NAME },
        { status: 1 }
      );

      let status, value;
      if (!nationalProviderIdentifierNPI) {
        status = DISPUTE_STATUS.OUTREACH;
        value = {
          reason: "Yes"
        }
      } else if (existingStatus) {
        status = DISPUTE_STATUS.ELIGIBLE;
        value = {
          reason: "No"
        }
      }
      if (status) {
        const update = {
          updateOne: {
            filter: {
              disputeId: toObjectId(disputeId),
              name: CHECK_LIST.NPI.NAME
            },
            update: {
              $set: {
                status: status,
                name: CHECK_LIST.NPI.NAME,
                statement: CHECK_LIST.NPI.STATEMENT,
                value: value,
                outreachVar:true
              }
            },
            upsert: true
          }
        };
        return update;
      }
      // let status = (nationalProviderIdentifierNPI) ? DISPUTE_STATUS.ELIGIBLE : DISPUTE_STATUS.OUTREACH
      // await eligibiltyCheckControllerV1.updateDisputeStatus(disputeId, status, CHECK_LIST.NPI)
    } catch (error) {
      throw error
    }
  }


  async checkCOI(disputeId: string, state: string) {
    try {
      let proceed: boolean, value: any
      let status: string;

      if (COI_STATES.includes(state)) {
        proceed = false;
        status = DISPUTE_STATUS.NOT_ELIGIBLE;
        value = {
          reason: `Yes, ${state}`
        }
      } else {
        proceed = true;
        status = DISPUTE_STATUS.ELIGIBLE;
        value = {
          reason: `No, ${state}`
        }
      }
      const update = {
        updateOne: {
          filter: {
            disputeId: toObjectId(disputeId),
            name: CHECK_LIST.COI.NAME
          },
          update: {
            $set: { status: status, proceed: proceed, name: CHECK_LIST.COI.NAME, statement: CHECK_LIST.COI.STATEMENT, value: value }
          },
          upsert: true
        }
      }
      return update;
      // await eligibiltyCheckControllerV1.updateDisputeStatus(disputeId, status, CHECK_LIST.COI, proceed)
    } catch (error) {
      throw error
    }
  }

  async checkOpenNegotiation(disputeId: string, openNegotiationPeriodStartDate: string) {
    try {
      const existingStatus = await this.findOne(
        this.modelEligible,
        { disputeId: toObjectId(disputeId), name: CHECK_LIST.OPEN_NEGOTIATION_DATE.NAME },
        { status: 1 }
      );

      let status;
      if (!openNegotiationPeriodStartDate) {
        status = DISPUTE_STATUS.OUTREACH;
      } else if (existingStatus) {
        status = DISPUTE_STATUS.ELIGIBLE;
      }

      if (status) {
        const update = {
          updateOne: {
            filter: {
              disputeId: toObjectId(disputeId),
              name: CHECK_LIST.OPEN_NEGOTIATION_DATE.NAME
            },
            update: {
              $set: {
                status: status,
                name: CHECK_LIST.OPEN_NEGOTIATION_DATE.NAME,
                statement: CHECK_LIST.OPEN_NEGOTIATION_DATE.STATEMENT,
                value: {
                  reason: moment(openNegotiationPeriodStartDate).format('MM-DD-YYYY')
                },
                outreachVar:true
              }
            },
            upsert: true
          }
        };
        return update;
      }
    } catch (error) {
      throw error;
    }
  }


  async checkIDRENegotiation(disputeId: string, openNegotiationPeriodStartDate: string, complainantAttestationDate: string,data?:any) {
    try {
      let status: string
      if (openNegotiationPeriodStartDate) {
        const calculateBusinessDays = await eligibiltyCheckControllerV1.calculateBusinessDays(openNegotiationPeriodStartDate, complainantAttestationDate, data)
        console.log('******calculateBusinessDays********', calculateBusinessDays)
        status = (calculateBusinessDays <= 30 || calculateBusinessDays > 34) ? DISPUTE_STATUS.NOT_ELIGIBLE : DISPUTE_STATUS.ELIGIBLE
      } else {
        status = DISPUTE_STATUS.OUTREACH
      }
      const update = {
        updateOne: {
          filter: {
            disputeId: toObjectId(disputeId),
            name: CHECK_LIST.IDRE_DATE.NAME
          },
          update: {
            $set: { status: status, name: CHECK_LIST.IDRE_DATE.NAME, statement: CHECK_LIST.IDRE_DATE.STATEMENT, value: { complainantAttestationDate: complainantAttestationDate, reason: moment(complainantAttestationDate).format('MM-DD-YYYY') } }
          },
          upsert: true
        }
      }
      return update;
      // await eligibiltyCheckControllerV1.updateDisputeStatus(disputeId, status, CHECK_LIST.IDRE_DATE)
    } catch (error) {
      throw error
    }
  }


  async checkPartiesInfo(disputeId, params) {
    try {
      const existingStatus = await this.findOne(
        this.modelEligible,
        { disputeId: toObjectId(disputeId), name: CHECK_LIST.PARTIES_INFO.NAME, statement: {$exists:true} },
        { status: 1 }
      );

      const requiredFields = PARTIES_INFO;

      const fieldDisplayNames = {
        complainantName: 'Complainant Name',
        complainantPhoneNumber: 'Complainant Phone Number',
        // complainantGroupName: 'Complainant Group Name',
        complainantEmailAddress: 'Complainant Email Address',
        complainantCity: 'Complainant City',
        complainantState: 'Complainant State',
        complainantType: 'Complainant Type',
        complainantZipCode: 'Complainant Zip Code',
        complainantAddressLine1: 'Complainant Address Line 1',
        respondentZip: 'Respondent Zip',
        respondentType: 'Respondent Type',
        respondentState: 'Respondent State',
        respondentPhoneNumber: 'Respondent Phone Number',
        respondentName: 'Respondent Name',
        // respondentGroupName: 'Respondent Group Name',
        respondentEmailAddress: 'Respondent Email Address',
        respondentCity: 'Respondent City',
        respondentAddressLine1: 'Respondent Address Line 1'
      };

      const missingFields = requiredFields
        .filter(field => !params[field])
        .map(field => `${fieldDisplayNames[field]}`);

      let statusUpdate = existingStatus?.status;
      if (missingFields.length) {
        statusUpdate = DISPUTE_STATUS.OUTREACH;
      } else if (statusUpdate) {
        statusUpdate = DISPUTE_STATUS.ELIGIBLE;
      }

      if (missingFields.length || statusUpdate) {
        const update = {
          updateOne: {
            filter: { disputeId: toObjectId(disputeId), name: CHECK_LIST.PARTIES_INFO.NAME },
            update: {
              $set: {
                status: statusUpdate,
                name: CHECK_LIST.PARTIES_INFO.NAME,
                ...(missingFields.length && { statement: `${missingFields.join(', ')} missing` }),
                outreachVar:true
              }
            },
            upsert: true
          }
        };
        return update;
      }
    } catch (error) {
      throw error;
    }
  }




  async checkLineItemsInfo(disputeId: string, items: any) {
    try {
      const updateDisputeStatus = [];

      const createUpdateOperation = (name: string, status: string, statement: string, proceed: boolean | null = null, value: any = null, upsert: boolean = true) => ({
        updateOne: {
          filter: { disputeId: toObjectId(disputeId), name },
          update: {
            $set: {
              status,
              name,
              statement,
              ...(proceed !== null && { proceed }),
              ...(value && { value }),
              outreachVar:true
            },
          },
          upsert,
        },
      });

      for (const [index, item] of items.entries()) {
        // const itemName = (baseName: string) => `${baseName}${index}`;
        const itemName = (baseName: string) => `${baseName}`;

        // Check service date
        if (new Date(item.dateOfItemOrService) < new Date(SERVICE_DATE)) {
          updateDisputeStatus.push(
            createUpdateOperation(
              CHECK_LIST.SERVICE_PRIOR.NAME,
              DISPUTE_STATUS.NOT_ELIGIBLE,
              CHECK_LIST.SERVICE_PRIOR.STATEMENT,
              false,
              { item, reason: "Yes" }
            )
          );
        }
        // Check claim Number
        if (!item.claimNumber) {
          updateDisputeStatus.push(
            createUpdateOperation(
              itemName(CHECK_LIST.CLAIM_NUMBER.NAME),
              DISPUTE_STATUS.OUTREACH,
              CHECK_LIST.CLAIM_NUMBER.STATEMENT
            )
          );
        } else {
          updateDisputeStatus.push(
            createUpdateOperation(
              itemName(CHECK_LIST.CLAIM_NUMBER.NAME),
              DISPUTE_STATUS.ELIGIBLE,
              CHECK_LIST.CLAIM_NUMBER.STATEMENT,
              null,
              null,
              false
            )
          );
        }

        // Check location of service
        if (item.locationOfService) {
          const isCOIState = COI_STATES.includes(item.locationOfService);
          const isBifurcatedProcess = STATES.BifurcatedProcess.includes(item.locationOfService)
          let reason: string
          let status: string
          updateDisputeStatus.push(
            createUpdateOperation(
              itemName(CHECK_LIST.COI.NAME),
              isCOIState ? DISPUTE_STATUS.NOT_ELIGIBLE : DISPUTE_STATUS.ELIGIBLE,
              CHECK_LIST.COI.STATEMENT,
              !isCOIState,
              { reason: `${isCOIState ? "Yes" : "No"}, ${STATE_NAMES[item.locationOfService]} (${item.locationOfService})` }
            )
          );
          if (isBifurcatedProcess) {
            redisClient.setExp(`${REDIS_PREFIX.NAME}.${disputeId}.${REDIS_SUFFIX.BIFURCATED_STATE}`, SERVER.TOKEN_INFO.EXPIRATION_TIME.BIFURCATED / 1000, true,)
            reason = `Yes, Bifurcated State: ${STATE_NAMES[item.locationOfService]} (${item.locationOfService})`
            status = DISPUTE_STATUS.OUTREACH
          } else {
            reason = `No, Federal State: ${STATE_NAMES[item.locationOfService]} (${item.locationOfService})`
            status = DISPUTE_STATUS.ELIGIBLE
          }
          updateDisputeStatus.push(
            createUpdateOperation(
              itemName(CHECK_LIST.STATE_PROCESS.NAME),
              status,
              CHECK_LIST.STATE_PROCESS.STATEMENT,
              true,
              { reason: reason }
            )
          );
          updateDisputeStatus.push(
            createUpdateOperation(
              itemName(CHECK_LIST.LOCATION_OF_SERVICE.NAME),
              DISPUTE_STATUS.ELIGIBLE,
              CHECK_LIST.LOCATION_OF_SERVICE.STATEMENT,
              null,
              null,
              false
            )
          );
        } else {
          updateDisputeStatus.push(
            createUpdateOperation(
              itemName(CHECK_LIST.LOCATION_OF_SERVICE.NAME),
              DISPUTE_STATUS.OUTREACH,
              CHECK_LIST.LOCATION_OF_SERVICE.STATEMENT
            )
          );
        }

        // Check place of service code
        if (!item.placeOfServiceCode) {
          updateDisputeStatus.push(
            createUpdateOperation(
              itemName(CHECK_LIST.PLACE_OF_SERIVCE.NAME),
              DISPUTE_STATUS.OUTREACH,
              CHECK_LIST.PLACE_OF_SERIVCE.STATEMENT
            )
          );
        } else {
          updateDisputeStatus.push(
            createUpdateOperation(
              itemName(CHECK_LIST.PLACE_OF_SERIVCE.NAME),
              DISPUTE_STATUS.ELIGIBLE,
              CHECK_LIST.PLACE_OF_SERIVCE.STATEMENT,
              null,
              null,
              false
            )
          );
        }

        // Check qualifying payment amount
        if (item.qualifyingPaymentAmount === null || item.qualifyingPaymentAmount === undefined) {
          updateDisputeStatus.push(
            createUpdateOperation(
              itemName(CHECK_LIST.QPA_MISSING.NAME),
              DISPUTE_STATUS.OUTREACH,
              CHECK_LIST.QPA_MISSING.STATEMENT
            )
          );
        } else {
          updateDisputeStatus.push(
            createUpdateOperation(
              itemName(CHECK_LIST.QPA_MISSING.NAME),
              DISPUTE_STATUS.ELIGIBLE,
              CHECK_LIST.QPA_MISSING.STATEMENT,
              null,
              null,
              false
            )
          );
        }

        // Check service code
        if (!item.serviceCode) {
          updateDisputeStatus.push(
            createUpdateOperation(
              itemName(CHECK_LIST.SERVICE_CODE_MISSING.NAME),
              DISPUTE_STATUS.OUTREACH,
              CHECK_LIST.SERVICE_CODE_MISSING.STATEMENT
            )
          );
        } else {
          updateDisputeStatus.push(
            createUpdateOperation(
              itemName(CHECK_LIST.SERVICE_CODE_MISSING.NAME),
              DISPUTE_STATUS.ELIGIBLE,
              CHECK_LIST.SERVICE_CODE_MISSING.STATEMENT,
              null,
              null,
              false
            )
          );
        }

        // Check triple zero condition
        const isTripleZero = [item.qualifyingPaymentAmount, item.costSharingAmount, item.initialPaymentAmount].every(amount => amount === 0 || amount == null);
        if (isTripleZero) {
          updateDisputeStatus.push(
            createUpdateOperation(
              itemName(CHECK_LIST.TRIPLE_ZERO.NAME),
              DISPUTE_STATUS.NOT_ELIGIBLE,
              CHECK_LIST.TRIPLE_ZERO.STATEMENT,
              false,
              {reason:"Yes"}
            )
          );
        } else {
          updateDisputeStatus.push(
            createUpdateOperation(
              itemName(CHECK_LIST.TRIPLE_ZERO.NAME),
              DISPUTE_STATUS.ELIGIBLE,
              CHECK_LIST.TRIPLE_ZERO.STATEMENT,
              true,
              {reason:"No"}

            )
          );
        }
      }

      return updateDisputeStatus;
    } catch (error) {
      throw error;
    }
  }



  async checkInitiatingParty(disputeId: string, initiatingParty: string) {
    try {
      const existingStatus = await this.findOne(
        this.modelEligible,
        { disputeId: toObjectId(disputeId), name: CHECK_LIST.INITIATING_PARTY_NAME.NAME },
        { status: 1 }
      );

      let status;
      if (!initiatingParty) {
        status = DISPUTE_STATUS.OUTREACH;
      } else if (existingStatus) {
        status = DISPUTE_STATUS.ELIGIBLE;
      }

      if (status) {
        const update = {
          updateOne: {
            filter: {
              disputeId: toObjectId(disputeId),
              name: CHECK_LIST.INITIATING_PARTY_NAME.NAME
            },
            update: {
              $set: {
                status: status,
                name: CHECK_LIST.INITIATING_PARTY_NAME.NAME,
                statement: CHECK_LIST.INITIATING_PARTY_NAME.STATEMENT,
                outreachVar:true
              }
            },
            upsert: true
          }
        };
        return update;
      }
    } catch (error) {
      throw error;
    }
  }


  async checkIDRWithCoolingOffDate(disputeId: string, params: any, aiResponse: any, objection?: string) {
    try {
      // Check if the parameters match
      console.log(aiResponse, params.taxIdentifierNumberTaxID, params.nationalProviderIdentifierNPI)
      let statement = objection ? OBJECTION.COOLING_OFF_PERIOD : CHECK_LIST.PROOF_COOLING_OFF.STATEMENT;
      let TIN_STATUS = (params.taxIdentifierNumberTaxID.toString() === aiResponse?.TaxId) ? true : false
      let NPI_STATUS = (params.nationalProviderIdentifierNPI.toString() === aiResponse?.NPI) ? true : false
      if (TIN_STATUS || NPI_STATUS) {

        // Parse the begins_date from aiResponse
        const beginsDate = moment(aiResponse.begins_date, [
          'MMMM D, YYYY',    // e.g., June 2, 2022
          'MM/DD/YYYY',      // e.g., 06/02/2022
          'MM-DD-YYYY',      // e.g., 06-02-2022
          'MM.DD.YYYY',      // e.g., 06.02.2022
          'YYYY/MM/DD',      // e.g., 2022/06/02
          'YYYY-MM-DD',      // e.g., 2022-06-02
          'YYYY.MM.DD',      // e.g., 2022.06.02 
        ], true);

        if (!beginsDate.isValid()) {
          console.error('error in begins date')
        }
        const coolingOffEndDate = beginsDate.clone().add(89, 'days');
        console.log("Cooling off period ends on:", coolingOffEndDate.format('YYYY-MM-DD'));

        // Parse params.date
        // const endDate = moment(params.complainantAttestationDate, ['YYYY-MM-DD', 'DD-MM-YYYY'], true);
        // if (!endDate.isValid()) {
        //     throw new Error("Invalid complainantAttestationDate format");
        // }

        // Calculate the number of business days between the cooling off end date and endDate
        // const businessDaysDiff = endDate.businessDiff(coolingOffEndDate);
        const data = {
          submissionWindowExpiredReason:params.submissionWindowExpiredReason, 
          startDate:coolingOffEndDate,
          endDate: params.complainantAttestationDate, 
          nipName: params.respondentName, 
          ipName: params.complainantName, 
          state: [params.respondentState,params.complainantState,params.disputeLineItems[0].locationOfService]
        }
        const calculateBusinessDays = await eligibiltyCheckControllerV1.calculateBusinessDays(coolingOffEndDate, params.complainantAttestationDate)
        console.log(`Business days between cooling off end date and end date: ************, ${calculateBusinessDays}`);

        let update;

        // Check if the difference is within the required range
        if (calculateBusinessDays < 0 || calculateBusinessDays > 30) {
          console.log(calculateBusinessDays, '::::::::;he:::::::::::::::::')
          // If not within range, mark as NOT_ELIGIBLE
          update = {
            updateOne: {
              filter: {
                disputeId: toObjectId(disputeId),
                name: CHECK_LIST.IDRE_DATE.NAME
              },
              update: {
                $set: {
                  status: DISPUTE_STATUS.NOT_ELIGIBLE,
                  value: {
                    complainantAttestationDate: params.complainantAttestationDate,
                    coolingOffEndDate: coolingOffEndDate.format('YYYY-MM-DD'),
                    reason: `Idre date: ${moment(params.complainantAttestationDate).format('MM-DD-YYYY')}`,
                  }
                }
              },
              upsert: true
            }
          };
        } else {
          // If within range, mark as ELIGIBLE
          console.log(calculateBusinessDays, '::::::::;else:::::::::::::::::')
          update = {
            updateOne: {
              filter: {
                disputeId: toObjectId(disputeId),
                name: CHECK_LIST.IDRE_DATE.NAME
              },
              update: {
                $set: {
                  status: DISPUTE_STATUS.ELIGIBLE,
                  value: {
                    complainantAttestationDate: params.complainantAttestationDate,
                    coolingOffEndDate: coolingOffEndDate.format('YYYY-MM-DD'),
                    reason: `Idre date: ${moment(params.complainantAttestationDate).format('MM-DD-YYYY')}`,
                  }
                }
              },
              upsert: true
            }
          };
        }

        // Common update for proof of cooling off status
        const proofUpdate = {
          updateOne: {
            filter: {
              disputeId: toObjectId(disputeId),
              name: CHECK_LIST.PROOF_COOLING_OFF.NAME
            },
            update: {
              $set: {
                status: DISPUTE_STATUS.ELIGIBLE,
                name: CHECK_LIST.PROOF_COOLING_OFF.NAME,
                statement: statement,
                value: {
                  // reason: `Tax Id: ${aiResponse.TaxId}, NPI: ${aiResponse.NPI} and cooling Off End Date: ${coolingOffEndDate.format('MM-DD-YYYY')}`,
                  reason: {
                    tin: {
                      status:TIN_STATUS,
                      value: aiResponse.TaxId
                    },
                    npi: {
                      status: NPI_STATUS,
                      value : aiResponse.NPI
                    },
                    coolingOff: {
                      value: coolingOffEndDate.format('MM-DD-YYYY')
                    }
                  }
                },
                objection:objection
              }
            },
            upsert: true
          }
        };
        console.log([update, proofUpdate])
        // Return an array with both updates    
        return [update, proofUpdate];

      } else {
        // Handle the case where params do not match
        const proofUpdate = {
          updateOne: {
            filter: {
              disputeId: toObjectId(disputeId),
              name: CHECK_LIST.PROOF_COOLING_OFF.NAME
            },
            update: {
              $set: {
                status: DISPUTE_STATUS.NOT_ELIGIBLE,
                name: CHECK_LIST.PROOF_COOLING_OFF.NAME,
                statement: statement,
                value: {
                  // reason: `Tax Id: ${aiResponse.TaxId}, NPI: ${aiResponse.NPI}`,
                  reason: {
                    tin: {
                      status:TIN_STATUS,
                      value: aiResponse.TaxId
                    },
                    npi: {
                      status: NPI_STATUS,
                      value : aiResponse.NPI
                    }
                  }
                },
                objection:objection
              }
            },
            upsert: true
          }
        };
        return [proofUpdate

        ];
      }
    } catch (error) {
      throw error;
    }
  }


  async checkObjections(params: any) {
    try {
      const { requests, response } = params.data;
      let update: any = {};
      let idreStatus: string;
      let bulkWriteOperations: any = await redisClient.getValue(`${REDIS_PREFIX.NAME}.${requests.disputeId}`);
      console.log('bulk write operation>>>>>>>>>>',bulkWriteOperations,'disputeId',requests.disputeId);
      bulkWriteOperations = JSON.parse(bulkWriteOperations);

      if (requests.submissionWindowExpiredReason == SUBMISSION_WINDOW.COOLING_OFF) {
        const result = await this.checkIDRWithCoolingOffDate(requests.disputeId, requests, response.SubmissionWindowResponseOutput);
        bulkWriteOperations.push(...result);
      }
      // console.log(response.details.length && bulkWriteOperations)
      if (response.details.length && bulkWriteOperations) {
        for (const item of response.details) {
          console.log(item, '<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
          if (item.objection == KAFKA_OBJECTION.NEGOTIATION_NOT_INITIATED) {
            const filter = {
              disputeId: toObjectId(requests.disputeId),
              name: CHECK_LIST.TIMELY_OPEN_NEGOTIATION.NAME
            };

            const setObjection = {
              // objection: OBJECTION.NEGOTIATION_NOT_INITIATED,
              statement: CHECK_LIST.TIMELY_OPEN_NEGOTIATION.STATEMENT,
              objection:KAFKA_OBJECTION.NEGOTIATION_NOT_INITIATED
            };

            // Handle OUTREACH status or missing payment date
            if (item.status == DISPUTE_STATUS.OUTREACH || !item.value.payment_date) {
              update = {
                updateOne: {
                  filter,
                  update: {
                    $set: {
                      status: DISPUTE_STATUS.OUTREACH,
                      value: {
                        reason: `PRA Not Found`,
                        file: "PRA"
                      },
                      ...setObjection
                    }
                  },
                  upsert: true
                }
              };
              bulkWriteOperations.push(update);
            }

            // Handle eligibility check based on TIN/NPI/claim_number and payment date
            else if ((item?.value.taxId == requests.taxIdentifierNumberTaxID ||
              item.value.npi == requests.nationalProviderIdentifierNPI ||
              item.value.claim_number == requests.disputeLineItems[0].claimNumber) &&
              item.value.payment_date) {
              const data = {
                submissionWindowExpiredReason:requests.submissionWindowExpiredReason, 
                startDate:item.value.payment_date,
                endDate: requests.openNegotiationPeriodStartDate, 
                nipName: requests.respondentName, 
                ipName: requests.complainantName, 
                complainantAttestationDate: requests.complainantAttestationDate,
                state: [requests.respondentState,requests.complainantState,requests.disputeLineItems[0].locationOfService]
              }
              const calculateDays = await eligibiltyCheckControllerV1.calculateBusinessDays(item.value.payment_date, requests.openNegotiationPeriodStartDate, data);
              console.log(calculateDays, 'calculateDays');

              const status = (calculateDays > 0 && calculateDays <= 30) ? DISPUTE_STATUS.ELIGIBLE : DISPUTE_STATUS.NOT_ELIGIBLE;
              const reason = (status == DISPUTE_STATUS.ELIGIBLE)
                ? `Yes, Payment Date: ${item.value.payment_date}`
                : `No, Payment Date: ${item.value.payment_date}`;

              update = {
                updateOne: {
                  filter,
                  update: {
                    $set: {
                      status,
                      value: {
                        payment_date: item.value.payment_date,
                        reason
                      },
                      ...setObjection
                    }
                  },
                  upsert: true
                }
              };
              bulkWriteOperations.push(update);
            }
          }

          if (item.objection == KAFKA_OBJECTION.NEGOTIATION_NOT_COMPLETED) {
            update = {
              updateOne: {
                filter: {
                  disputeId: toObjectId(requests.disputeId),
                  name: CHECK_LIST.IDRE_DATE.NAME
                },
                update: {
                  $set: {
                    objection: KAFKA_OBJECTION.NEGOTIATION_NOT_COMPLETED,
                  }
                },
                upsert: true
              }
            };
            bulkWriteOperations.push(update);
          }
          if (item.objection == KAFKA_OBJECTION.STATE_PROCESS) {
            if (requests.bifurcatedState) {
              idreStatus = item.status;
              update = {
                updateOne: {
                  filter: {
                    disputeId: toObjectId(requests.disputeId),
                    name: CHECK_LIST.STATE_PROCESS.NAME
                  },
                  update: {
                    $set: {
                      status: item.status,
                      proceed: false,
                      objection: KAFKA_OBJECTION.STATE_PROCESS,
                      statement: CHECK_LIST.STATE_PROCESS.STATEMENT
                    }
                  },
                  upsert: true
                }
              };
              bulkWriteOperations.push(update);
            } else {
              update = {
                updateOne: {
                  filter: {
                    disputeId: toObjectId(requests.disputeId),
                    name: CHECK_LIST.STATE_PROCESS.NAME
                  },
                  update: {
                    $set: {
                      status: DISPUTE_STATUS.ELIGIBLE,
                      proceed: false,
                      objection: KAFKA_OBJECTION.STATE_PROCESS,
                      statement: CHECK_LIST.STATE_PROCESS.STATEMENT
                    }
                  },
                  upsert: true
                }
              };
              bulkWriteOperations.push(update);
            }
          }
          if (item.objection == KAFKA_OBJECTION.FOUR_DAY_TIMELINE) {
            update = {
              updateOne: {
                filter: {
                  disputeId: toObjectId(requests.disputeId),
                  name: CHECK_LIST.IDRE_DATE.NAME
                },
                update: {
                  $set: {
                    objection: KAFKA_OBJECTION.FOUR_DAY_TIMELINE,
                  }
                },
                upsert: true
              }
            };
            bulkWriteOperations.push(update);
          }

          if (item.objection == KAFKA_OBJECTION.COOLING_OFF_PERIOD) {
            if (item.status == DISPUTE_STATUS.OUTREACH) {
              update = {
                updateOne: {
                  filter: {
                    disputeId: toObjectId(requests.disputeId),
                    name: CHECK_LIST.PROOF_COOLING_OFF.NAME
                  },
                  update: {
                    $set: {
                      status: DISPUTE_STATUS.OUTREACH,
                      objection: KAFKA_OBJECTION.COOLING_OFF_PERIOD,
                      statement: OBJECTION.COOLING_OFF_PERIOD,
                      value: {
                        reason:"Proof missing"
                      }
                    }
                  },
                  upsert: true
                }
              };
              bulkWriteOperations.push(update);
            } else {
              const result = await this.checkIDRWithCoolingOffDate(requests.disputeId, requests, item.value, KAFKA_OBJECTION.COOLING_OFF_PERIOD);
              bulkWriteOperations.push(...result);
            }
          }
          if (item.objection == KAFKA_OBJECTION.SUBJECT_TO_NSA) {
            if (item.reason == OBJECTION_REASON.SUBJECT_TO_NSA.SPECIAL_MEDICAL_PLAN) {
              update = {
                updateOne: {
                  filter: {
                    disputeId: toObjectId(requests.disputeId),
                    name: CHECK_LIST.SUBJECT_TO_NSA.NAME
                  },
                  update: {
                    $set: {
                      objection: KAFKA_OBJECTION.SUBJECT_TO_NSA,
                      status: DISPUTE_STATUS.NOT_ELIGIBLE,
                      proceed: false,
                      statement: CHECK_LIST.SUBJECT_TO_NSA.STATEMENT
                    }
                  },
                  upsert: true
                }
              };
              bulkWriteOperations.push(update);
            }
            else if (item.reason == OBJECTION_REASON.SUBJECT_TO_NSA.BIFURCATED_STATE && requests.bifurcatedState) {
              update = {
                updateOne: {
                  filter: {
                    disputeId: toObjectId(requests.disputeId),
                    name: CHECK_LIST.SUBJECT_TO_NSA.NAME
                  },
                  update: {
                    $set: {
                      objection: KAFKA_OBJECTION.SUBJECT_TO_NSA,
                      status: DISPUTE_STATUS.OUTREACH,
                      proceed: false,
                      statement: CHECK_LIST.SUBJECT_TO_NSA.STATEMENT
                    }
                  },
                  upsert: true
                }
              };
              bulkWriteOperations.push(update);
            }
            else {
              update = {
                updateOne: {
                  filter: {
                    disputeId: toObjectId(requests.disputeId),
                    name: CHECK_LIST.SUBJECT_TO_NSA.NAME
                  },
                  update: {
                    $set: {
                      objection: KAFKA_OBJECTION.SUBJECT_TO_NSA,
                      status: item.status,
                      proceed: false,
                      statement: CHECK_LIST.SUBJECT_TO_NSA.STATEMENT,
                      reason: item?.reason
                    }
                  },
                  upsert: true
                }
              };
              bulkWriteOperations.push(update);
            }



          }
          if (item.objection == KAFKA_OBJECTION.POLICY_YEAR) {
            let policyStatus: boolean = true, status: string, reason: string;
            if (item.policy_date) {
              const policyDate = moment.utc(item.policy_date, DATE_PATTERN, true);
              for (const data of requests.disputeLineItems) {
                const dateOfItemOrService = moment.utc(data.dateOfItemOrService, 'YYYY-MM-DD');
                if (policyDate.isAfter(dateOfItemOrService)) {
                  policyStatus = false;
                  reason = `Policy Date: ${moment(policyDate).format('MM-DD-YYYY')} and Service Date: ${moment(dateOfItemOrService).format('MM-DD-YYYY')}`;
                }
              }

              status = policyStatus ? DISPUTE_STATUS.ELIGIBLE : DISPUTE_STATUS.NOT_ELIGIBLE;
            } else if (!item.policy_date) {
              status = DISPUTE_STATUS.OUTREACH;
              reason = "Policy Documents required";
            }
            const update = {
              updateOne: {
                filter: {
                  disputeId: toObjectId(requests.disputeId),
                  name: CHECK_LIST.POLICY_YEAR.NAME
                },
                update: {
                  $set: {
                    objection: KAFKA_OBJECTION.POLICY_YEAR,
                    status: status,
                    statement: CHECK_LIST.POLICY_YEAR.STATEMENT,
                    value: { reason: reason }
                  }
                },
                upsert: true
              }
            };
            bulkWriteOperations.push(update);
          }
          if (item.objection == KAFKA_OBJECTION.NOTICE_OF_INITIATION_NOT_SUBMITTED) {
            update = {
              updateOne: {
                filter: {
                  disputeId: toObjectId(requests.disputeId),
                  name: CHECK_LIST.NOTICE_OF_INITIATION_NOT_SUBMITTED.NAME
                },
                update: {
                  $set: {
                    objection: KAFKA_OBJECTION.NOTICE_OF_INITIATION_NOT_SUBMITTED,
                    status: DISPUTE_STATUS.OUTREACH,
                    proceed: false,
                    statement: CHECK_LIST.NOTICE_OF_INITIATION_NOT_SUBMITTED.STATEMENT
                  }
                },
                upsert: true
              }
            };
            bulkWriteOperations.push(update);
          }
          if (item.objection == KAFKA_OBJECTION.OTHER) {
            update = {
              updateOne: {
                filter: {
                  disputeId: toObjectId(requests.disputeId),
                  name: CHECK_LIST.OTHER.NAME
                },
                update: {
                  $set: {
                    objection: KAFKA_OBJECTION.OTHER,
                    status: DISPUTE_STATUS.NOT_VERIFIED,
                    proceed: false,
                    statement: CHECK_LIST.OTHER.STATEMENT
                  }
                },
                upsert: true
              }
            };
            bulkWriteOperations.push(update);
          }
          if (item.objection == KAFKA_OBJECTION.COVERED_BY_PLAN) {
            if (item.reason == OBJECTION_REASON.COVERED_BY_PLAN.BIFURCATED_STATE && requests.bifurcatedState) {
              update = {
                updateOne: {
                  filter: {
                    disputeId: toObjectId(requests.disputeId),
                    name: CHECK_LIST.COVERED_BY_PLAN.NAME
                  },
                  update: {
                    $set: {
                      objection: KAFKA_OBJECTION.COVERED_BY_PLAN,
                      status: DISPUTE_STATUS.OUTREACH,
                      proceed: false,
                      statement: CHECK_LIST.COVERED_BY_PLAN.STATEMENT
                    }
                  },
                  upsert: true
                }
              };
              bulkWriteOperations.push(update);
            } else {
              update = {
                updateOne: {
                  filter: {
                    disputeId: toObjectId(requests.disputeId),
                    name: CHECK_LIST.COVERED_BY_PLAN.NAME
                  },
                  update: {
                    $set: {
                      objection: KAFKA_OBJECTION.COVERED_BY_PLAN,
                      status: item.status,
                      proceed: false,
                      statement: CHECK_LIST.COVERED_BY_PLAN.STATEMENT
                    }
                  },
                  upsert: true
                }
              };
              bulkWriteOperations.push(update);
            }
          }
        }
      }
      return await eligibiltyCheckDaoV1.disputeCheckSaveAndConclusion(requests, response, bulkWriteOperations);

    } catch (error) {
      throw error;
    }
  }


}
export const eligibiltyCheckMapper = new EligibiltyCheckMapper();








