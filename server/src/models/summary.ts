import mongoose from "mongoose";

const ParsedDateSchema = new mongoose.Schema({
    day: String,
    month: String,
    year: String,
});

export const summarySchema = new mongoose.Schema({
    summary: {
        type: String,
        required: String
    },
    email: {
        type: String,
        required: String
    },
    date: ParsedDateSchema
});

const SummaryModel = mongoose.model('Summaries', summarySchema);
export default SummaryModel;