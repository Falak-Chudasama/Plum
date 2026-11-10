import { Router, Request, Response } from "express";
import categoryOps from "../controllers/category.controllers";
import handleError from "../utils/errors.utils";
import { AuthenticatedRequest } from "../types/types";

const categoryRouter = Router();
const filePath = "/src/routes/category.routes.ts";

async function find(req: Request, res: Response) {
    try {
        const userEmail = (req as AuthenticatedRequest).user.email;
        const result = await categoryOps.findUserCategories(userEmail);
        return res.status(200).json({ result, categories: result, success: true });
    } catch (err) {
        handleError(filePath, "find", res, err, "finding categories");
    }
}

async function findByEmailRoute(req: Request, res: Response) {
    try {
        const userEmail = (req as AuthenticatedRequest).user.email;
        const requestedEmail = req.params.email;

        // Prevent cross-account access: user can only fetch their own categories
        if (requestedEmail && requestedEmail !== userEmail) {
            return res.status(403).json({ success: false, message: "Forbidden: Cannot access categories of another account" });
        }

        const result = await categoryOps.findUserCategories(userEmail);
        return res.status(200).json({ result, categories: result, success: true });
    } catch (err) {
        handleError(filePath, "findByEmailRoute", res, err, "finding categories by email");
    }
}

async function create(req: Request, res: Response) {
    try {
        const userEmail = (req as AuthenticatedRequest).user.email;
        const category = req.body;
        const result = await categoryOps.create(category, userEmail);

        if (!result) {
            return res.status(500).json({ success: false, message: "Failed to create category" });
        }

        return res.status(200).json({ result, success: true });
    } catch (err) {
        handleError(filePath, "create", res, err, "creating category");
    }
}

async function edit(req: Request, res: Response) {
    try {
        const userEmail = (req as AuthenticatedRequest).user.email;
        const category = req.body;
        const result = await categoryOps.edit(category, userEmail);

        if (!result) {
            return res.status(404).json({ success: false, message: "Category not found or access denied" });
        }

        return res.status(200).json({ result, success: true });
    } catch (err) {
        handleError(filePath, "edit", res, err, "editing category");
    }
}

async function deleteCategory(req: Request, res: Response) {
    try {
        const userEmail = (req as AuthenticatedRequest).user.email;
        const categoryName = String(req.query.category || req.body.category || "");

        if (!categoryName) {
            return res.status(400).json({ success: false, message: "Missing category name" });
        }

        const result = await categoryOps.deleteCategory(categoryName, userEmail);
        if (!result) {
            return res.status(404).json({ success: false, message: "Category not found or access denied" });
        }

        return res.status(200).json({ success: true, message: "Category deleted" });
    } catch (err) {
        handleError(filePath, "deleteCategory", res, err, "deleting category");
    }
}

// api.plum.com/category
categoryRouter.get("/find", find);
categoryRouter.get("/find/:email", findByEmailRoute);
categoryRouter.post("/create", create);
categoryRouter.patch("/edit", edit);
categoryRouter.delete("/delete", deleteCategory);

export default categoryRouter;
