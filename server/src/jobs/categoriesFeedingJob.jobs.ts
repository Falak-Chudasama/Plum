import categoryOps from "../controllers/category.controllers";
import msAPIs from "../apis/ms.apis";
import { handleErrorUtil } from "../utils/errors.utils";
import globals from "../globals/globals";
import logger from "../utils/logger.utils";

const filePath = '/src/jobs/categoriesFeedingJob.jobs.ts';
const delay = 10 * 60 * 1000;
let mainHasFed = false;

const main = async () => {
    mainHasFed = true;
    try {
        logger.info('A Job. Categories Feeding Job Running');
        await msAPIs.catogDelAll();
        const categories = await categoryOps.find();
        const modifiedCategs = categories.map((cat) => {
            return `${cat.category}::${cat.description}`
        });
        const response = await msAPIs.catogEmbed(modifiedCategs);
        if (!response) mainHasFed = false;
        logger.info('A Job. Categories are successfully fed');
    } catch (err) {
        mainHasFed = false;
        logger.warn('A Job. Categories Feeding Job Stopped');
        handleErrorUtil(filePath, 'main', err, 'Feeding Categories / Calling MS APIs');
        throw Error(err);
    }
};

const startCategoriesFeedingJob = async () => {
    try {
        if (globals.categoriesFeedingJobRunning) return;
        logger.info('A Loop. Categories Feeding Job Loop Running');
        globals.categoriesFeedingJobRunning = true;

        if (!mainHasFed) await main();
        logger.info(`A Loop. Job will begin in ${delay / 60000} minutes...`);
        setInterval(async () => {
            if (!mainHasFed) await main();
            logger.info(`A Loop. Job will begin in ${delay / 60000} minutes...`);
        }, delay);
    } catch (err) {
        logger.warn('A Loop. Categories Feeding Job Loop Stopped');
        globals.categoriesFeedingJobRunning = false;
        handleErrorUtil(filePath, 'categoriesFeedingJob', err, 'Starting Categories Feeding Job');
        throw Error(err);
    }
};

export default startCategoriesFeedingJob;
export {
    main as categoriesFeeding
};