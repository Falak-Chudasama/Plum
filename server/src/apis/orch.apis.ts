import axios from "axios";
import { InboundEmailType, CategoryType } from "../types/types"
import { handleErrorUtil } from "../utils/errors.utils";
import constants from "../constants/constants";

const filePath = '/src/apis/orch.apis.ts';

const categorize = async (emails: InboundEmailType[], categories: CategoryType[]): Promise<InboundEmailType[] | null> => {
    try {
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

const orchAPIs = {
    categorize
};

export default orchAPIs;