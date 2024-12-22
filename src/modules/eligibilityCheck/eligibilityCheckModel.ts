"use strict";

import mongoose, { Document, model, Model, Schema } from "mongoose";

import { DB_MODEL_REF, DISPUTE, DISPUTE_STATUS } from "@config/constant";
import { KAFKA_OBJECTION } from "./eligibilityConstants";

export interface EligibilityCheck extends Document {
    disputeId: Schema.Types.ObjectId,
    name: string,
    statement: string,
    status: string,
    proceed: boolean,
    created: number,
    value:object,
    objection:string,
    outreachVar:boolean
}

const eligibilityCheckSchema: Schema = new mongoose.Schema({
    _id: { type: Schema.Types.ObjectId, required: true, auto: true },
    disputeId: {
        type: Schema.Types.ObjectId,
        index: true,
        ref: DB_MODEL_REF.DISPUTES,
        required: true
    },
    name: {
        type: String,
        required: true,
    },
    statement: {
        type: String,
        enum: Object.values(DISPUTE)
    },
    status: {
        type: String,
        enum: Object.values(DISPUTE_STATUS),
        // default: DISPUTE_STATUS.NOT_ELIGIBLE
    },
    proceed: {
        type: Boolean,
        default: true
    },
    value: {
        type: Object,
        required: false
    },
    objection:{type:String,enum: Object.values(KAFKA_OBJECTION)},
    outreachVar: {type:Boolean,default:false},
    created: { type: Number, default: Date.now }
}, {
    versionKey: false,
    timestamps: true
});


export const eligibility_checks: Model<EligibilityCheck> = model<EligibilityCheck>(DB_MODEL_REF.ELIGIBILITY_CHECK, eligibilityCheckSchema);