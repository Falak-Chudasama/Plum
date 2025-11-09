import { handleErrorUtil } from "../utils/errors.utils";
import logger from "../utils/logger.utils";
import reRankingOps from "../utils/rankCandidates.utils";
import msAPIs from "../apis/ms.apis";

const filePath = '/agents/intentParser.agents.ts';

const parseIntent = async (prompt: string): Promise<any> => {
    try {
        logger.info('Intent Parser Agent Called');
        const res = await msAPIs.intentSearch(prompt, 100);
        const rankedIntent = reRankingOps.routeIntent(prompt, res);
        logger.info(`Prompt Intent: ${rankedIntent.bestIntent}(${rankedIntent.bestScore})`);
        return {
            intent: rankedIntent.bestIntent,
            confidence: rankedIntent.bestScore
        }
    } catch (err) {
        handleErrorUtil(filePath, 'chat', err, 'Parsing Intent using MS APIs');
    }
};

export default parseIntent;