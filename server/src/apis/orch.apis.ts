import axios from "axios";
import { InboundEmailType, CategoryType } from "../types/types"
import { handleErrorUtil } from "../utils/errors.utils";
import constants from "../constants/constants";
import logger from "../utils/logger.utils";

const filePath = '/src/apis/orch.apis.ts';

const categorize = async (emails: InboundEmailType[], categories: CategoryType[]): Promise<InboundEmailType[] | null> => {
    try {
        logger.info('Categorize API called');
        const result = await axios.post(`${constants.orchOrigin}/categorize`, { 
            emails, categories
        }, { timeout: 30 * 60 * 1000 });

        if (!result.data || !result.data.success) throw Error('Failed to get categorized mails');

        return result.data;
    } catch (err) {
        handleErrorUtil(filePath, 'categorize', err, 'Calling Orch API to categorize emails');
    }
    return null;
};

const summarize = async (emails: InboundEmailType[]): Promise<{ summary: string, success: boolean } | null> => {
    try {
        logger.info('Summarize API Called');
        const result = await axios.post(`${constants.orchOrigin}/summarize`, {
            emails
        }, { timeout: 30 * 60 * 1000 });

        return result.data;
    } catch (err) {
        handleErrorUtil(filePath, 'summarize', err, 'Calling Orch API to summarize emails');
        return null;
    }
}

const orchAPIs = {
    categorize,
    summarize
};

export default orchAPIs;