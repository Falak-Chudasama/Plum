import axios from "axios";
import fs from "fs";
import https from "https";
import { InboundEmailType } from "../types/types";
import { handleErrorUtil } from "../utils/errors.utils";
import constants from "../constants/constants";
import logger from "../utils/logger.utils";

const filePath = '/src/apis/orch.apis.ts';

const CA_PATH = process.env.CA_PATH || '';

let httpsAgent: https.Agent;
let usingInsecureFallback = false;

try {
    if (!CA_PATH) throw new Error('CA_PATH not set');

    const ca = fs.readFileSync(CA_PATH);
    httpsAgent = new https.Agent({ ca });
    logger.info(`[orch.apis] Loaded CA from: ${CA_PATH}`);
} catch (err: any) {
    logger.warn(`[orch.apis] Could not load CA at CA_PATH="${CA_PATH}": ${err?.message || err}. Falling back to insecure agent (rejectUnauthorized=false).`);
    httpsAgent = new https.Agent({ rejectUnauthorized: false });
    usingInsecureFallback = true;
}

const orchAxios = axios.create({
    httpsAgent,
    timeout: 2 * 60 * 60 * 1000,
});

const delay = 2 * 60;

const categorize = async (emails: InboundEmailType[]): Promise<InboundEmailType[] | null> => {
    try {
        logger.info('Categorize API called');
        const result = await orchAxios.post(`${constants.orchOrigin}/categorize`, { emails }, {
            timeout: delay * 60 * 1000,
        });

        if (!result.data || !result.data.success) throw Error('Failed to get categorized mails');

        return result.data.emails;
    } catch (err) {
        handleErrorUtil(filePath, 'categorize', err, 'Calling Orch API to categorize emails');
    }
    return null;
};

const summarize = async (emails: InboundEmailType[]): Promise<{ summary: string, highlights: string, insights: string, actions: string, success: boolean } | null> => {
    try {
        logger.info('Summarize API Called');
        const result = await orchAxios.post(`${constants.orchOrigin}/summarize`, { emails }, {
            timeout: delay * 60 * 1000,
        });

        return result.data;
    } catch (err) {
        handleErrorUtil(filePath, 'summarize', err, 'Calling Orch API to summarize emails');
        return null;
    }
};

const orchAPIs = {
    categorize,
    summarize,
};

export default orchAPIs;
