"use strict";

import mongoose, { Document, model, Model, Schema } from "mongoose";
import { DAY, DB_MODEL_REF, PARTY_TYPE, STATUS } from "@config/constant";

// Define the interface for the Extension document
export interface Extension extends Document {
  ipName: string[];
  nipName: string[];
  status: string;
  startDate: number;
  endDate: number;
  reason?: string;
  ipType: string;
  nipType: string;
  stateName: string[];
  day: string;
}

const extensionsSchema: Schema = new mongoose.Schema(
  {
    ipName: { type: [String], required: false },
    nipName: { type: [String], required: false },
    status: {
      type: String,
      enum: [STATUS.UN_BLOCKED, STATUS.DELETED],
      default: STATUS.UN_BLOCKED,
    },
    startDate: { type: Number, required: true },
    endDate: { type: Number, required: false },
    reason: { type: String, required: false },
    ipType: {
      type: String,
      enum: [PARTY_TYPE.ALL, PARTY_TYPE.NOT_ALL],
      default: PARTY_TYPE.NOT_ALL,
    },
    nipType: {
      type: String,
      enum: [PARTY_TYPE.ALL, PARTY_TYPE.NOT_ALL],
      default: PARTY_TYPE.NOT_ALL,
    },
    created: { type: Number, default: Date.now },
    stateName: { type: [String], required: false },
    groupId: { type: Schema.Types.ObjectId, required: true },
    day: { type: String, enum: [DAY.WEEKDAY, DAY.WEEKEND] },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

extensionsSchema.index({ status: 1, startDate: 1, endDate: 1 });

export const extensions: Model<Extension> = model<Extension>(
  DB_MODEL_REF.EXTENSION,
  extensionsSchema
);
