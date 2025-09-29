import utils from "../utils/utils";
import SummaryModel from "../models/summary";
import { SummaryType } from "../types/types";
import { handleErrorUtil } from "../utils/errors.utils";

const filePath = '/src/controllers/summary.controllers.ts';

const findByEmail = async (email: string): Promise<SummaryType[] | null> => {
    try {
        const summary = await SummaryModel.find({ email: email });
        if (!summary) return null;

        return summary;
    } catch (err) {
        handleErrorUtil(filePath, 'findByEmail', err, 'Finding/Fetching Summaries by Email from DB');
        return null;
    }
};

const findByDate = async (day: string, month: string, year: string): Promise<SummaryType | null> => {
    try {
        const summary = await SummaryModel.findOne({ "date.day": day, "date.month": month, "date.year": year });
        if (!summary) return null;
        return summary;
    } catch (err) {
        handleErrorUtil(filePath, 'findByDate', err, 'Finding/Fetching Summary by Date from DB');
        return null;
    }
};

const create = async (email: string, summary: string, highlights: string, insights: string, actions: string): Promise<boolean> => {
    try {
        const { day, month, year } = utils.getToday();

        const result = await SummaryModel.create({ summary, email, highlights, insights, actions, date: { day, month, year } });

        if (!result || !result._id) {
            throw Error('Failed to persist summary');
        }

        return true;
    } catch (err) {
        handleErrorUtil(filePath, 'add', err, 'Adding a summary into DB');
        return false;
    }
};

const summaryOps = {
    findByEmail,
    findByDate,
    create
};

export default summaryOps;