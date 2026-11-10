import { Request, Response } from "express";
import CategoryModel from "../models/category";
import { CategoryType, AuthenticatedRequest } from "../types/types";
import { handleErrorUtil } from "../utils/errors.utils";

const filePath = "/src/controllers/category.controllers.ts";

const findUserCategories = async (email: string): Promise<CategoryType[]> => {
    try {
        const categories = await CategoryModel.find({ email });
        return categories;
    } catch (err) {
        handleErrorUtil(filePath, "findUserCategories", err, `Fetching Categories for user=${email}`);
        throw err;
    }
};

const findByEmail = async (req: Request, res: Response) => {
    try {
        const authEmail = (req as AuthenticatedRequest).user?.email || req.params.email;
        const categories = await findUserCategories(authEmail);
        return res.status(200).json({ categories, success: true });
    } catch (err) {
        handleErrorUtil(filePath, "findByEmail", err, "Fetching categories by email");
        return res.status(500).json({ success: false, message: "Error fetching categories" });
    }
};

const findByEmailCategory = async (email: string, category: string): Promise<CategoryType | null> => {
    try {
        const categoryObject = await CategoryModel.findOne({ email, category });
        return categoryObject;
    } catch (err) {
        handleErrorUtil(filePath, "findByEmailCategory", err, "Finding Category in DB");
        return null;
    }
};

const create = async (category: CategoryType, email: string): Promise<CategoryType | null> => {
    try {
        category.email = email; // Enforce account ownership

        const existing = await CategoryModel.findOne({ email, category: category.category });
        if (existing) {
            throw new Error(`Category '${category.category}' already exists for this account`);
        }

        const result = await CategoryModel.create(category);
        if (!result) throw new Error("Failed to persist category");

        return result;
    } catch (err) {
        handleErrorUtil(filePath, "create", err, "Adding a category into DB");
        throw err;
    }
};

const edit = async (category: CategoryType, email: string): Promise<CategoryType | null> => {
    try {
        const filter = category._id 
            ? { _id: category._id, email }
            : { category: category.category, email };

        const result = await CategoryModel.findOneAndUpdate(
            filter,
            {
                category: category.category,
                description: category.description,
                alert: category.alert,
                color: category.color,
                email, // Ensure email ownership cannot be changed
            },
            { new: true, upsert: false }
        );

        return result;
    } catch (err) {
        handleErrorUtil(filePath, "edit", err, "Editing category in DB");
        throw err;
    }
};

const deleteCategory = async (category: string, email: string): Promise<any> => {
    try {
        const query: any = {
            email,
            $or: [
                { category: category },
                { category: new RegExp(`^${category}$`, "i") }
            ]
        };
        const result = await CategoryModel.findOneAndDelete(query);
        return result;
    } catch (err) {
        handleErrorUtil(filePath, "deleteCategory", err, "Deleting category from DB");
        throw err;
    }
};

const categoryOps = {
    findUserCategories,
    findByEmail,
    findByEmailCategory,
    create,
    edit,
    deleteCategory,
};

export default categoryOps;
