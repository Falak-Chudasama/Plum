import { InboundEmailType } from "../types/types";
import { handleErrorUtil } from "../utils/errors.utils";
import logger from "../utils/logger.utils";
import msAPIs from "../apis/ms.apis";

const filePath = '/agents/categorizer.agents.ts';

const k = 2;
const similarityLimit = 0.9;

const categorize = async (mails: InboundEmailType[]): Promise<InboundEmailType[]> => {
    try {
        logger.info('Categorizor Agent Called');
        for (let i = 0; i < mails.length; i++) {
            const mail = mails[i];
            const categories = await msAPIs.catogSearch(
                `
                Subject: ${mail.subject}
                Body: ${mail.bodyText}
                `, k
            );
            if (!categories) throw Error('Failed to categorize the mail (check if MS is running)');
            if (categories[1].distance <= similarityLimit) {
                mail.categories = categories.map((cat) => cat.text.split('::')[0]);
            } else if (categories[0].distance <= similarityLimit) {
                mail.categories = categories[0].text.split('::')[0];
            } else {
                mail.categories = ['Other'];
            }
        }
        return mails;
    } catch (err) {
        handleErrorUtil(filePath, 'categorize', err, 'Categorizing the inbound mails');
        return [];
    }
};

export default categorize;