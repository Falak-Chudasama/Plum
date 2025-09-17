import { Request, Response } from "express";
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

const findByEmail = async (req: Request, res: Response) => {
    const { email } = req.params;
    try {
        const categories = await CategoryModel.find({ email }) || [];
        return res.status(200).json({ categories, success: true });
    } catch (err) {
        handleErrorUtil(filePath, "find", err, "Finding/Fetching Categories from DB");
        return res.status(500).json({ error: "Failed to fetch categories", success: false });
    }
};

const categoryOps = {
    find,
    create,
    findByEmail
};

export default categoryOps;