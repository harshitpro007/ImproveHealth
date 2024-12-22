"use strict";

import mongoose, { Document, model, Model, Schema } from "mongoose";
import { DB_MODEL_REF } from "@config/constant";

export interface IFile {
    name: string;
    url: string;
    type: string;
    reference: string;
}

export interface IDRECasesFiles extends Document {
    disputeId: Schema.Types.ObjectId;
    drn: string;
    created: number;
    files: IFile[];
}

const FileSchema: Schema = new mongoose.Schema({
    name: {
        type: String,
        required: false,
    },
    url: {
        type: String,
        required: false,
    },
    type: {
        type: String
    },
    reference: {
        type: String
    },
    extension: {
        type: String
    }
}, {
    _id: false // Prevents Mongoose from creating an _id for each subdocument
});

const IDRECasesFilesSchema: Schema = new mongoose.Schema({
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
    files: {
        type: [FileSchema],
        default: []
    },
    created: { type: Number, default: Date.now }
}, {
    versionKey: false,
    timestamps: true
});

IDRECasesFilesSchema.index({drn:1});

export const idre_cases_files: Model<IDRECasesFiles> = model<IDRECasesFiles>(DB_MODEL_REF.IDRE_CASES_FILES, IDRECasesFilesSchema);
