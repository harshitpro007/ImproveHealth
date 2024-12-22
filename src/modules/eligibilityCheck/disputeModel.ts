"use strict";

import mongoose, { Document, model, Model, Schema } from "mongoose";

import { DB_MODEL_REF } from "@config/index";

export interface IDispute extends Document {
	waiveSurpriseBillingProtections: string;
	taxIdentifierNumberTaxID: string;
	submissionWindowExpiredReason: string | null;
	settlementValid: string | null;
	settlementSubmitted: string | null;
	resubmissionForFollowingDispute: string | null;
	respondentZip: string;
	respondentType: string;
	respondentState: string;
	respondentSecondaryContactPhone: string | null;
	respondentSecondaryContactName: string | null;
	respondentSecondaryContactEmail: string | null;
	respondentPrimaryContactPhone: string | null;
	respondentPrimaryContactName: string | null;
	respondentPrimaryContactEmail: string | null;
	respondentPhoneNumber: string;
	respondentName: string;
	respondentGroupName: string | null;
	respondentFax: string | null;
	respondentEmailAddress: string;
	respondentCity: string;
	respondentAddressLine2: string | null;
	respondentAddressLine1: string;
	reasonDisputeIsNotEligible: string | null;
	otherClosureReason: string | null;
	openNegotiationPeriodStartDate: Date;
	objectionPlanPolicyYearStartDate: Date | null;
	nonInitiatingPartyStatusOfExtension: string | null;
	nonInitiatingPartyOffersOfPayment: string | null;
	nonInitiatingPartyInformationReceive: string | null;
	nonInitiatingPartyInformationNeeded: string | null;
	nonInitiatingPartyInformationDetails: string | null;
	nonInitiatingPartyExtensionEndDate: Date | null;
	nonInitiatingPartyEntityFeeReceived: string | null;
	nonInitiatingPartyAdminFeeReceived: string;
	nonInitiatingParty: string;
	nipIneligibilityReason: string | null;
	natureOfNonInitiatingPartyCOI: string | null;
	natureOfInitiatingPartyCOI: string | null;
	nationalProviderIdentifierNPI: string;
	isTheErisaPlanSelfInsured: boolean;
	initiatingPartyStatusOfExtension: string | null;
	initiatingPartyOffersOfPayment: string | null;
	initiatingPartyInformationReceived: string | null;
	initiatingPartyInformationNeeded: string | null;
	initiatingPartyInformationDetails: string | null;
	initiatingPartyExtensionEndDate: Date | null;
	initiatingPartyEntityFeeReceived: string | null;
	initiatingPartyCOI: string | null;
	initiatingPartyAdminFeeReceived: string;
	initiatingParty: string;
	healthPlanType: string;
	fehbEnrollmentCode: string | null;
	extensionRequestedByInitiatingParty: string | null;
	extensionRequestByNonInitiatingParty: string | null;
	entitySelectionDateCoiExists: Date | null;
	disputeStatus: string;
	disputeNotEligibleReason: string | null;
	disputeEligible: string | null;
	complainantZipCode: string;
	complainantType: string;
	complainantState: string;
	complainantSecondaryContactPhone: string | null;
	complainantSecondaryContactName: string | null;
	complainantSecondaryContactEmail: string | null;
	complainantPrimaryContactPhone: string | null;
	complainantPrimaryContactName: string | null;
	complainantPrimaryContactEmail: string | null;
	complainantPhoneNumber: string;
	complainantName: string;
	complainantGroupName: string | null;
	complainantFax: string | null;
	complainantEmailAddress: string;
	complainantCity: string;
	complainantAttestationSignature: string;
	complainantAddressLine2: string | null;
	complainantAddressLine1: string;
	compensationPaidToIdre: string | null;
	coiExists: string | null;
	closureReason: string | null;
	administrativeClosureReason: string | null;
	paymentDeterminationOutcome: string | null;
	objectionOtherAdditionalDetails: string | null;
	objectionOpenNegCompleteDate: Date | null;
	objectionItemsNotCoveredByPolicy: string | null;
	objectionItemNotNSACovered: string | null;
	objectionIncorrectlyBundledList: string | null;
	objectionIncorrectlyBatchedList: string | null;
	objectionDisputeNumberCoolingOff: string | null;
	objectionCoverageNotSubjectToNSA: string | null;
	objectionCitationForStateLaw: string | null;
	objection4DayPeriodEndedOn: Date | null;
	noticeOfOfferNIPLink: string | null;
	noticeOfOfferIPLink: string | null;
	noticeOfOfferDueDate: Date | null;
	nonInitiatingPartyCOI: string;
	nipSignature: string | null;
	nipPracticeOrFacilitySize: string | null;
	nipOfferSubmitDate: Date | null;
	nipIdrProcessDoesNotApplyReason: string | null;
	nipAttestIdrProcessDoesNotApply: string;
	lastModifiedDate: Date;
	ipSignature: string | null;
	ipPracticeOrFacilitySize: string | null;
	ipOfferSubmitDate: Date | null;
	idrTaRecommendationComment: string | null;
	idrTaRecommendation: string | null;
	idrTaIdreAssignDate: Date | null;
	idreSelectionResponseDate: Date;
	files: Array<{ title: string; fileId: string }>;
	failureToSubmitOfferOrFee: string;
	entitySelectionDate: Date | null;
	disputeNumber: string;
	disputeLineItems: Array<{
		professionalService: boolean;
		postStabilizationServices: boolean;
		placeOfServiceCode: string;
		outOfNetworkAirAmbulanceServices: boolean;
		otherProvideDescription: boolean;
		otherItemsOrServicesDescription: string | null;
		nonParticipateProviderParticipateHCF: boolean;
		initialPaymentAmount: number;
		hospitalBasedServices: boolean;
		finalResolution: string | null;
		emergencyItemsOrServices: boolean;
		costSharingAmount: number;
		serviceCode: string;
		resubmissionSubmitDate: Date | null;
		resubmissionSentDate: Date | null;
		resubmissionReason: string | null;
		resubmissionDueDate: Date | null;
		respondentPracticeSpecialty: string | null;
		respondentGeographicRegion: string | null;
		respondentCoverageAreaZipCode: string | null;
		respondentClinicalCapacityLevel: string | null;
		respondentAirAmbulanceVehicleType: string | null;
		qualifyingPaymentAmount: number;
		nonInitiatingPartyPercentageOfQPA: string | null;
		nonInitiatingPartyFinalPaymentOffer: string | null;
		locationOfService: string;
		lineItemType: string | null;
		lastModifiedDate: Date;
		initiationResubmissionLink: string | null;
		initiatingPartyPercentageOfQPA: string | null;
		initiatingPartyFinalPaymentOffer: string | null;
		idreDispute: string;
		files: Array<{ title: string; fileId: string }>;
		disputeLineItemNumber: string;
		descriptionOfTheItemOrService: string;
		dateOfItemOrService: Date;
		complexStateApplicability: boolean;
		complainantPracticeSpecialty: string | null;
		complainantGeographicRegion: string | null;
		complainantCoverageAreaZipCode: string | null;
		complainantClinicalCapacityLevel: string | null;
		complainantAirAmbulanceVehicleType: string | null;
		claimNumber: string;
		airAmbulancePointOfPickup: string | null;
	}>;
	datePaymentDeterminationSent: Date | null;
	dateOfIDREAssignment: Date;
	complainantAttestationDate: Date;
	complainantAttestationAgreement: boolean;
	cmsAdminFee: number;
	bundledItemsServices: string;
	batchedItemsServices: string;
	attestIdrProcessApplies: string;
}

const disputeSchema: Schema = new mongoose.Schema({
	_id: { type: Schema.Types.ObjectId, required: true, auto: true },
	dispute: {
		waiveSurpriseBillingProtections: { type: String, required: false },
		taxIdentifierNumberTaxID: { type: String, required: false },
		submissionWindowExpiredReason: { type: String, default: null },
		settlementValid: { type: String, default: null },
		settlementSubmitted: { type: String, default: null },
		resubmissionForFollowingDispute: { type: String, default: null },
		respondentZip: { type: String, required: false },
		respondentType: { type: String, required: false },
		respondentState: { type: String, required: false },
		respondentSecondaryContactPhone: { type: String, default: null },
		respondentSecondaryContactName: { type: String, default: null },
		respondentSecondaryContactEmail: { type: String, default: null },
		respondentPrimaryContactPhone: { type: String, default: null },
		respondentPrimaryContactName: { type: String, default: null },
		respondentPrimaryContactEmail: { type: String, default: null },
		respondentPhoneNumber: { type: String, required: false },
		respondentName: { type: String, required: false },
		respondentGroupName: { type: String, default: null },
		respondentFax: { type: String, default: null },
		respondentEmailAddress: { type: String, required: false },
		respondentCity: { type: String, required: false },
		respondentAddressLine2: { type: String, default: null },
		respondentAddressLine1: { type: String, required: false },
		reasonDisputeIsNotEligible: { type: String, default: null },
		otherClosureReason: { type: String, default: null },
		openNegotiationPeriodStartDate: { type: Date, required: false },
		objectionPlanPolicyYearStartDate: { type: Date, default: null },
		nonInitiatingPartyStatusOfExtension: { type: String, default: null },
		nonInitiatingPartyOffersOfPayment: { type: String, default: null },
		nonInitiatingPartyInformationReceive: { type: String, default: null },
		nonInitiatingPartyInformationNeeded: { type: String, default: null },
		nonInitiatingPartyInformationDetails: { type: String, default: null },
		nonInitiatingPartyExtensionEndDate: { type: Date, default: null },
		nonInitiatingPartyEntityFeeReceived: { type: String, default: null },
		nonInitiatingPartyAdminFeeReceived: { type: String, required: false },
		nonInitiatingParty: { type: String, required: false },
		nipIneligibilityReason: { type: String, default: null },
		natureOfNonInitiatingPartyCOI: { type: String, default: null },
		natureOfInitiatingPartyCOI: { type: String, default: null },
		nationalProviderIdentifierNPI: { type: String, required: false },
		isTheErisaPlanSelfInsured: { type: Boolean, required: false },
		initiatingPartyStatusOfExtension: { type: String, default: null },
		initiatingPartyOffersOfPayment: { type: String, default: null },
		initiatingPartyInformationReceived: { type: String, default: null },
		initiatingPartyInformationNeeded: { type: String, default: null },
		initiatingPartyInformationDetails: { type: String, default: null },
		initiatingPartyExtensionEndDate: { type: Date, default: null },
		initiatingPartyEntityFeeReceived: { type: String, default: null },
		initiatingPartyCOI: { type: String, default: null },
		initiatingPartyAdminFeeReceived: { type: String, required: false },
		initiatingParty: { type: String, required: false },
		healthPlanType: { type: String, required: false },
		fehbEnrollmentCode: { type: String, default: null },
		extensionRequestedByInitiatingParty: { type: String, default: null },
		extensionRequestByNonInitiatingParty: { type: String, default: null },
		entitySelectionDateCoiExists: { type: Date, default: null },
		disputeStatus: { type: String, required: false },
		disputeNotEligibleReason: { type: String, default: null },
		disputeEligible: { type: String, default: null },
		complainantZipCode: { type: String, required: false },
		complainantType: { type: String, required: false },
		complainantState: { type: String, required: false },
		complainantSecondaryContactPhone: { type: String, default: null },
		complainantSecondaryContactName: { type: String, default: null },
		complainantSecondaryContactEmail: { type: String, default: null },
		complainantPrimaryContactPhone: { type: String, default: null },
		complainantPrimaryContactName: { type: String, default: null },
		complainantPrimaryContactEmail: { type: String, default: null },
		complainantPhoneNumber: { type: String, required: false },
		complainantName: { type: String, required: false },
		complainantGroupName: { type: String, default: null },
		complainantFax: { type: String, default: null },
		complainantEmailAddress: { type: String, required: false },
		complainantCity: { type: String, required: false },
		complainantAttestationSignature: { type: String, required: false },
		complainantAddressLine2: { type: String, default: null },
		complainantAddressLine1: { type: String, required: false },
		compensationPaidToIdre: { type: String, default: null },
		coiExists: { type: String, default: null },
		closureReason: { type: String, default: null },
		administrativeClosureReason: { type: String, default: null },
		paymentDeterminationOutcome: { type: String, default: null },
		objectionOtherAdditionalDetails: { type: String, default: null },
		objectionOpenNegCompleteDate: { type: Date, default: null },
		objectionItemsNotCoveredByPolicy: { type: String, default: null },
		objectionItemNotNSACovered: { type: String, default: null },
		objectionIncorrectlyBundledList: { type: String, default: null },
		objectionIncorrectlyBatchedList: { type: String, default: null },
		objectionDisputeNumberCoolingOff: { type: String, default: null },
		objectionCoverageNotSubjectToNSA: { type: String, default: null },
		objectionCitationForStateLaw: { type: String, default: null },
		objection4DayPeriodEndedOn: { type: Date, default: null },
		noticeOfOfferNIPLink: { type: String, default: null },
		noticeOfOfferIPLink: { type: String, default: null },
		noticeOfOfferDueDate: { type: Date, default: null },
		nonInitiatingPartyCOI: { type: String, required: false },
		nipSignature: { type: String, default: null },
		nipPracticeOrFacilitySize: { type: String, default: null },
		nipOfferSubmitDate: { type: Date, default: null },
		nipIdrProcessDoesNotApplyReason: { type: String, default: null },
		nipAttestIdrProcessDoesNotApply: { type: String, required: false },
		lastModifiedDate: { type: Date, required: false },
		ipSignature: { type: String, default: null },
		ipPracticeOrFacilitySize: { type: String, default: null },
		ipOfferSubmitDate: { type: Date, default: null },
		idrTaRecommendationComment: { type: String, default: null },
		idrTaRecommendation: { type: String, default: null },
		idrTaIdreAssignDate: { type: Date, default: null },
		idreSelectionResponseDate: { type: Date, required: false },
		files: [{ title: { type: String, required: false }, fileId: { type: String, required: false } }],
		failureToSubmitOfferOrFee: { type: String, required: false },
		entitySelectionDate: { type: Date, default: null },
		disputeNumber: { type: String, required: true, unique:true },
		disputeLineItems: [{
			professionalService: { type: Boolean, required: false },
			postStabilizationServices: { type: Boolean, required: false },
			placeOfServiceCode: { type: String, required: false },
			outOfNetworkAirAmbulanceServices: { type: Boolean, required: false },
			otherProvideDescription: { type: Boolean, required: false },
			otherItemsOrServicesDescription: { type: String, default: null },
			nonParticipateProviderParticipateHCF: { type: Boolean, required: false },
			initialPaymentAmount: { type: Number, required: false },
			hospitalBasedServices: { type: Boolean, required: false },
			finalResolution: { type: String, default: null },
			emergencyItemsOrServices: { type: Boolean, required: false },
			costSharingAmount: { type: Number, required: false },
			serviceCode: { type: String, required: false },
			resubmissionSubmitDate: { type: Date, default: null },
			resubmissionSentDate: { type: Date, default: null },
			resubmissionReason: { type: String, default: null },
			resubmissionDueDate: { type: Date, default: null },
			respondentPracticeSpecialty: { type: String, default: null },
			respondentGeographicRegion: { type: String, default: null },
			respondentCoverageAreaZipCode: { type: String, default: null },
			respondentClinicalCapacityLevel: { type: String, default: null },
			respondentAirAmbulanceVehicleType: { type: String, default: null },
			qualifyingPaymentAmount: { type: Number, required: false },
			nonInitiatingPartyPercentageOfQPA: { type: String, default: null },
			nonInitiatingPartyFinalPaymentOffer: { type: String, default: null },
			locationOfService: { type: String, required: false },
			lineItemType: { type: String, default: null },
			lastModifiedDate: { type: Date, required: false },
			initiationResubmissionLink: { type: String, default: null },
			initiatingPartyPercentageOfQPA: { type: String, default: null },
			initiatingPartyFinalPaymentOffer: { type: String, default: null },
			idreDispute: { type: String, required: false },
			files: [{ title: { type: String, required: false }, fileId: { type: String, required: false } }],
			disputeLineItemNumber: { type: String, required: false },
			descriptionOfTheItemOrService: { type: String, required: false },
			dateOfItemOrService: { type: Date, required: false },
			complexStateApplicability: { type: Boolean, required: false },
			complainantPracticeSpecialty: { type: String, default: null },
			complainantGeographicRegion: { type: String, default: null },
			complainantCoverageAreaZipCode: { type: String, default: null },
			complainantClinicalCapacityLevel: { type: String, default: null },
			complainantAirAmbulanceVehicleType: { type: String, default: null },
			claimNumber: { type: String, required: false },
			airAmbulancePointOfPickup: { type: String, default: null },
		}],
		datePaymentDeterminationSent: { type: Date, default: null },
		dateOfIDREAssignment: { type: Date, required: false },
		complainantAttestationDate: { type: Date, required: false },
		complainantAttestationAgreement: { type: Boolean, required: false },
		cmsAdminFee: { type: Number, required: false },
		bundledItemsServices: { type: String, required: false },
		batchedItemsServices: { type: String, required: false },
		attestIdrProcessApplies: { type: String, required: false },
	},
	created: {type:Number, default:Date.now()}
}, {
	versionKey: false,
	timestamps: true
});

disputeSchema.index({updatedAt:1})

export const disputes: Model<IDispute> = model<IDispute>(DB_MODEL_REF.DISPUTES, disputeSchema);
