"use strict";

const mongoose = require("mongoose");
import { Document, model, Model, Schema } from "mongoose";

import { DB_MODEL_REF, NOTIFICATION_TYPE, STATUS } from "@config/constant";

export interface INotification extends Document {
	senderId?: Schema.Types.ObjectId;
	receiverId: Schema.Types.ObjectId;
	activityId: Schema.Types.ObjectId;
	message: string;
	type: string;
	isRead: boolean;
	status?: string;
	created: number;
}

const notificationSchema: Schema = new mongoose.Schema({
	senderId: {
		type: Schema.Types.ObjectId,
		ref: DB_MODEL_REF.USER,
		required: false
	},

	receiverId: {
		type: Schema.Types.ObjectId,
		ref: DB_MODEL_REF.USER
	},
	title: { type: String, required: false},
	message: { type: String, required: true },
	type: {
		type: String,
		required: true,
		enum: Object.values(NOTIFICATION_TYPE)
	},
	isRead: { type: Boolean, default: false },
	status: {
		type: String,
		required: false,
		enum: [STATUS.DELETED,STATUS.SCHEDULE.TYPE,STATUS.SEND.TYPE,STATUS.DRAFT.TYPE, STATUS.ACTIVE],
		default: STATUS.ACTIVE
	},
	created: { type: Number, default: Date.now }
}, {
	versionKey: false,
	timestamps: true
});

notificationSchema.index({ receiverId: 1 });
notificationSchema.index({ status: 1 });

// Export notification schema
export const notifications: Model<INotification> = model<INotification>(DB_MODEL_REF.NOTIFICATION, notificationSchema);
