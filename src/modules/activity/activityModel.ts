"use strict";

import mongoose, { Document, model, Model, Schema } from "mongoose";

import { DB_MODEL_REF, STATUS, ACTIVITY_TYPE, MODULES } from "@config/constant";

export interface Activities extends Document {
    adminId: Schema.Types.ObjectId,
    disputeId: Schema.Types.ObjectId,
    type: string,
    status: string,
    // module: string,
    description: string,
    details: object,
    created: number

}

const activitiesSchema: Schema = new mongoose.Schema({
    _id: { type: Schema.Types.ObjectId, required: true, auto: true },
    adminId: {
        type: Schema.Types.ObjectId,
        index: true,
        ref: DB_MODEL_REF.ADMIN,
        required: false
    },
    disputeId: {
        type: Schema.Types.ObjectId,
        index: true,
        ref: DB_MODEL_REF.DISPUTES,
        required: false
    },
    type: {
        type: String,
        enum: [ACTIVITY_TYPE.FILE, ACTIVITY_TYPE.TEXT],
        default: ACTIVITY_TYPE.TEXT
    },
    status: {
        type: String,
        enum: [STATUS.BLOCKED, STATUS.UN_BLOCKED, STATUS.DELETED],
        default: STATUS.UN_BLOCKED
    },
    details: {
        type: Object,
    },
    description: { type: String, required: false },
    // module: {
    //     type: String,
    //     enum: Object.values(MODULES),
    //     required: false
    // },
    created: { type: Number, default: Date.now }
}, {
    versionKey: false,
    timestamps: true
});



// Export activities
export const activities: Model<Activities> = model<Activities>(DB_MODEL_REF.ACTIVITIES, activitiesSchema);