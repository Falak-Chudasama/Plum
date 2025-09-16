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
        await msAPIs.catogDelAll();
        const categories = await categoryOps.find();
        const modifiedCategs = categories.map((cat) => {
            return `${cat.category}::${cat.description}`
        });
        const response = await msAPIs.catogEmbed(modifiedCategs);
        if (!response) mainHasFed = false;
        logger.info('Categories are successfully fed');
    } catch (err) {
        mainHasFed = false;
        handleErrorUtil(filePath, 'main', err, 'Feeding Categories / Calling MS APIs');
        throw Error(err);
    }
};

const startCategoriesFeedingJob = async () => {
    try {
        if (globals.categoriesFeedingJobRunning) return;
        logger.info('Categories Feeding Job running');
        globals.categoriesFeedingJobRunning = true;

        if (!mainHasFed) await main();
        setInterval(async () => {
            if (!mainHasFed) await main();
        }, delay);
    } catch (err) {
        logger.warn('Categories Feeding Job stopped');
        globals.categoriesFeedingJobRunning = false;
        handleErrorUtil(filePath, 'categoriesFeedingJob', err, 'Starting Categories Feeding Job');
        throw Error(err);
    }
};

export default startCategoriesFeedingJob;
export {
    main as categoriesFeeding
};