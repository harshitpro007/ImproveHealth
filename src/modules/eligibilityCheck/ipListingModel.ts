"use strict";

import mongoose, { Document, model, Model, Schema } from "mongoose";

import { DB_MODEL_REF, STATUS } from "@config/constant";

export interface IPListing extends Document {
    name:string
}

const ipListingSchema: Schema = new mongoose.Schema({
    _id: { type: Schema.Types.ObjectId, required: true, auto: true },
    name: {
        type: String,
        required: true,
        unique:true
    },
    status: {
        type: String,
        enum: [STATUS.UN_BLOCKED,STATUS.BLOCKED],
        default: STATUS.UN_BLOCKED
    },
    created: { type: Number, default: Date.now }
}, {
    versionKey: false,
    timestamps: true
});


export const ip_listing: Model<IPListing> = model<IPListing>(DB_MODEL_REF.IP_LISTING, ipListingSchema);