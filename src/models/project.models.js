import mongoose, { Schema } from "mongoose";


const projectSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String
    },
    createdBy: {
        //refering to another id
        type: Schema.Types.ObjectId,
        ref: "User", //what we are refering in user.models.js that should be refered here also
        required: true
    }
}, { timestamps: true })

export const Project = mongoose.model("Project", projectSchema);