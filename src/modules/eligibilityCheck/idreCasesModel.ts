"use strict";

import mongoose, { Document, model, Model, Schema } from "mongoose";

import { DB_MODEL_REF, DISPUTE, DISPUTE_STATUS, COMPLAINANT_TYPE } from "@config/constant";

export interface IDRECases extends Document {
    disputeId: Schema.Types.ObjectId;
    drn: string;
    type: string;
    assignedDate: number;
    reviewDueDate: number;
    status: string;
    complainantType: string;
    assignedToAdminId: string;
    created: number;
    idreNoticeInfo:object;
    details:object;
    lowerCaseDrn:string;
    NO_OBJECTION: boolean;
    STATE_PROCESS: boolean;
    POLICY_YEAR: boolean;
    SUBJECT_TO_NSA: boolean;
    COVERED_BY_PLAN: boolean;
    NOT_NSA_ELIGIBLE: boolean;
    FOUR_DAY_TIMELINE: boolean;
    INCORRECTLY_BATCHED: boolean;
    INCORRECTLY_BUNDLED: boolean;
    NOTICE_OF_INITIATION_NOT_SUBMITTED: boolean;
    NEGOTIATION_NOT_COMPLETED: boolean;
    NEGOTIATION_NOT_INITIATED: boolean;
    COOLING_OFF_PERIOD: boolean;
    OTHER: boolean;
    reason:Array<string>
}

const IDRECasesSchema: Schema = new mongoose.Schema({
    _id: { type: Schema.Types.ObjectId, required: true, auto: true },
    disputeId: {
        type: Schema.Types.ObjectId,
        index: true,
        ref: DB_MODEL_REF.DISPUTES,
        required: true
    },
    drn: {
        type: String,
        required: true
    },
    lowerCaseDrn: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: Object.values(DISPUTE)
    },
    assignedDate: {
        type: Number,
        requried: false
    },
    reviewDueDate: {
        type: Number,
        required: false
    },
    status: {
        type: String,
        enum: Object.values(DISPUTE_STATUS),
        default: DISPUTE_STATUS.OPEN
    },
    complainantType: {
        type: String,
        enum: Object.values(COMPLAINANT_TYPE)
    },
    assignedToAdminId: {
        type: Schema.Types.ObjectId,
        ref: DB_MODEL_REF.ADMIN,
        required: false
    },
    idreNoticeInfo: {
        type: Object,
        required: false
    },
    details: {
        type: Object,
        required:false
    },
    STATE_PROCESS: { type: Boolean, default: false },
    POLICY_YEAR: { type: Boolean, default: false },
    SUBJECT_TO_NSA: { type: Boolean, default: false },
    COVERED_BY_PLAN: { type: Boolean, default: false },
    NOT_NSA_ELIGIBLE: { type: Boolean, default: false },
    FOUR_DAY_TIMELINE: { type: Boolean, default: false },
    INCORRECTLY_BATCHED: { type: Boolean, default: false },
    INCORRECTLY_BUNDLED: { type: Boolean, default: false },
    NOTICE_OF_INITIATION_NOT_SUBMITTED: { type: Boolean, default: false },
    NEGOTIATION_NOT_COMPLETED: { type: Boolean, default: false },
    NEGOTIATION_NOT_INITIATED: { type: Boolean, default: false },
    COOLING_OFF_PERIOD: { type: Boolean, default: false },
    OTHER: { type: Boolean, default: false },
    reason: {type: Array, required:false},
    assignedCreated: {
        type: Number, 
        required: false
    },
    created: { type: Number, default: Date.now },
    availableQPA: {type: Object, required:false},
}, {
    versionKey: false,
    timestamps: true
});

IDRECasesSchema.index({status:1});
IDRECasesSchema.index({createdAt:1});

export const idre_cases: Model<IDRECases> = model<IDRECases>(DB_MODEL_REF.IDRE_CASES, IDRECasesSchema);