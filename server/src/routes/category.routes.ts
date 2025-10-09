import { Router, Request, Response } from "express";
import categoryOps from "../controllers/category.controllers";
import handleError from "../utils/errors.utils";

const categoryRouter = Router();

const filePath = '/src/routes/category.routes.ts';

async function find(req: Request, res: Response) {
    try { 
        const result = await categoryOps.find();
        return res.status(200).json({ result, success: true });
    } catch (err) {
        handleError(filePath, 'find', res, err, 'finding category');
    }
}

async function create(req: Request, res: Response) {
    try {
        const category = req.body;
        const result = await categoryOps.create(category);

        if (!result) {
            return res.status(500).json({ result, success: false });
        }

        return res.status(200).json({ result, success: true });
    } catch (err) {
        handleError(filePath, 'create', res, err, 'creating category');
    }
}

async function edit(req: Request, res: Response) {
    try {
        const category = req.body;
        const result = await categoryOps.edit(category);;

        if (!result) {
            return res.status(500).json({ result, success: false });
        }

        return res.status(200).json({ result, success: true });
    } catch (err) {
        handleError(filePath, 'create', res, err, 'creating category');
    }
}

async function deleteCategory(req: Request, res: Response) {
    try {
        const { category, email } = req.body;
        const result = await categoryOps.deleteCategory(category, email);
    
        if (!result) {
            return res.status(500).json({ success: false });
        }

        return res.status(200).json({ success: true });
    } catch (err) {
        handleError(filePath, 'create', res, err, 'creating category');
    }
}

// api.plum.com/category
categoryRouter.get('/find', find);
categoryRouter.get('/find/:email', categoryOps.findByEmail);
categoryRouter.post('/create', create);
categoryRouter.post('/edit', edit);
categoryRouter.delete('/delete', deleteCategory);

export default categoryRouter;
export const categoryRouterOps = {
    find,
    create,
    edit,
    deleteCategory
};