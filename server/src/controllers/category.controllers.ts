import CategoryModel from "../models/category";
import { CategoryType } from "../types/types";
import { handleErrorUtil } from "../utils/errors.utils";

const filePath = '/src/controllers/category.controllers.ts';

const find = async (): Promise<CategoryType[]> => {
    try {
        const categories = await CategoryModel.find({});
        return categories ?? [];
    } catch (err) {
        handleErrorUtil(filePath, 'find', err, 'Finding/Fetching Categories from DB');
        return [];
    }
};

const create = async (category: CategoryType): Promise<boolean> => {
    try {
        const result = await CategoryModel.create(category);

        if (!result || !result._id) {
            throw Error('Failed to persist category');
        }

        return true;
    } catch (err) {
        handleErrorUtil(filePath, 'add', err, 'Adding a category into DB');
        return false;
    }
};

const categoryOps = {
    find,
    create
};

export default categoryOps;