"use strict";

import mongoose, { Document, model, Model, Schema } from "mongoose";

import { DB_MODEL_REF } from "@config/constant";

export interface LastScan extends Document {
    lastScanDate:Date;
    disputeId:Schema.Types.ObjectId;
}

const lastScanSchema: Schema = new mongoose.Schema({
    _id: { type: Schema.Types.ObjectId, required: true, auto: true },
    disputeId: {
        type: Schema.Types.ObjectId,
        index: true,
        ref: DB_MODEL_REF.DISPUTES,
        required: true
    },
    lastScanDate: {type:Date},
    created: { type: Number, default: Date.now }
}, {
    versionKey: false,
    timestamps: true
});

lastScanSchema.index({created:1})
export const last_scan: Model<LastScan> = model<LastScan>(DB_MODEL_REF.LAST_SCAN, lastScanSchema);