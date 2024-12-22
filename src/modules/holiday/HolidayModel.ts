"use strict";

import mongoose, { Document, model, Model, Schema } from "mongoose";

import { DAY, DB_MODEL_REF, STATUS } from "@config/constant";

export interface Holiday extends Document {
  name: string,
  status: string,
  date: string,
  day: string
}

const holidayDateSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  date: {
    type: Number,
    required: true,
  }
});

const holidaysSchema: Schema = new mongoose.Schema({
  _id: { type: Schema.Types.ObjectId, required: true, auto: true },
  name: { type: String, required: true },
  lowercaseName: { type: String, required: false, lowercase: true },
  status: {
    type: String,
    enum: [STATUS.UN_BLOCKED, STATUS.DELETED],
    default: STATUS.UN_BLOCKED
  },
  date: { type: Number, required: true }, // Define holidayDate as an array of objects
  day: { type: String, enum: [DAY.WEEKDAY, DAY.WEEKEND] },
  created: { type: Number, default: Date.now }
}, {
  versionKey: false,
  timestamps: true
});



// Export holidays
export const holidays: Model<Holiday> = model<Holiday>(DB_MODEL_REF.HOLIDAYS, holidaysSchema);