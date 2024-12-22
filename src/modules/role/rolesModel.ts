"use strict";


import * as mongoose from "mongoose";
import { Model } from "mongoose";
import { MODULES, MODULES_ID, STATUS, DB_MODEL_REF } from "@config/index";
const AutoIncrement = require('mongoose-sequence')(mongoose);
let Schema = mongoose.Schema;

export interface IRole extends mongoose.Document {
	role: string;
	permission: object;
	status: String;
	created:number;
}

let permission = new Schema({
	module: { type: String, required: true, enum: Object.values(MODULES) },
	moduleId: { type: String, required: true, enum: Object.values(MODULES_ID) },
	view: { type: Boolean, default: false },
	edit: { type: Boolean, default: false },
	add: { type: Boolean, default: false },
	delete: { type: Boolean, default: false },
}, {
	_id: false
});

let roleSchema = new Schema({
	_id: { type: Schema.Types.ObjectId, required: true, auto: true },
	roleUniqueId: {type:Number, start_seq: 1,},
	role: { type: String, required: true, index: true },
	permission: [permission],
	status: {
		type: String,
		enum: [
			STATUS.BLOCKED,
			STATUS.UN_BLOCKED,
			STATUS.DELETED
		],
		default: STATUS.UN_BLOCKED
	},
	created: { type: Number, default: Date.now },
	createdAt: { type: Number, default: Date.now },
	updatedAt: { type: Number, default: Date.now }
}, {
	versionKey: false,
	timestamps: false,
});

roleSchema.plugin(AutoIncrement, { inc_field: 'roleUniqueId' });


// Export roles
export let roles: Model<IRole> = mongoose.model<IRole>(DB_MODEL_REF.ROLE, roleSchema);