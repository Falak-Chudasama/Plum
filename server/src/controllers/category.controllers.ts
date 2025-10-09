import { Request, Response } from "express";
import CategoryModel from "../models/category";
import { CategoryType } from "../types/types";
import { handleErrorUtil } from "../utils/errors.utils";

const filePath = '/src/controllers/category.controllers.ts';

const find = async (): Promise<CategoryType[]> => {
    try {
        const categories = await CategoryModel.find({});
        return categories;
    } catch (err) {
        handleErrorUtil(filePath, 'find', err, 'Finding/Fetching Categories from DB');
        return [];
    }
};

const findByEmailCategory = async (email: string, category: string): Promise<CategoryType | null> => {
    try {
        const categoryObject = await CategoryModel.findOne({
            email,
            category
        });
        return categoryObject;
    } catch (err) {
        handleErrorUtil(filePath, 'find', err, 'Finding/Fetching Categories from DB');
        return null;
    }
}

const create = async (category: CategoryType): Promise<CategoryType | null> => {
    try {
        const result = await CategoryModel.create(category);

        if (!result || !result._id) {
            throw Error('Failed to persist category');
        }

        return result;
    } catch (err) {
        handleErrorUtil(filePath, 'add', err, 'Adding a category into DB');
        return null;
    }
};

const edit = async (category: CategoryType): Promise<CategoryType | null> => {
    try {
        const result = await CategoryModel.updateOne({
            category: category.category,
            email: category.email,
        }, {
            description: category.description,
            color: category.color,
            alert: category.alert
        },
            { upsert: true });

        if (result.acknowledged && (result.matchedCount > 0 || result.upsertedCount > 0)) {
            return category;
        }

        return null;
    } catch (err) {
        handleErrorUtil(filePath, 'edit', err, 'Edit a category into DB');
        return null;
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

const deleteCategory = async (category: string, email: string): Promise<boolean> => {
    try {
        const result = await CategoryModel.deleteOne({
            category,
            email,
        });

        if (result.acknowledged) {
            return true;
        }
        return false;
    } catch (err) {
        handleErrorUtil(filePath, 'deleteCategory', err, 'Deleting a category');
        return false;
    }
};

const categoryOps = {
    find,
    findByEmail,
    findByEmailCategory,
    create,
    edit,
    deleteCategory
};

export default categoryOps;