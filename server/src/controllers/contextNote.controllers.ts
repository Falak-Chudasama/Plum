import { Request, Response } from 'express';
import ContextNote from '../models/contextNote.models';
import { indexNoteEmbedding, retrieveRelevantContextNotes } from '../ai/services/contextNoteRag.service';
import { AuthenticatedRequest } from '../types/types';
import handleError from '../utils/errors.utils';
import logger from '../utils/logger.utils';

const filePath = '/src/controllers/contextNote.controllers.ts';

export const getNotes = async (req: Request, res: Response) => {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email || (req.query.email as string);
        if (!userEmail) {
            return res.status(401).json({ success: false, error: 'Unauthorized: missing user email' });
        }

        const notes = await ContextNote.find({ userEmail })
            .sort({ updatedAt: -1 })
            .select('-embedding')
            .lean();

        return res.status(200).json({
            success: true,
            notes,
        });
    } catch (err: any) {
        return handleError(filePath, 'getNotes', res, err, 'Fetching context notes');
    }
};

export const createNote = async (req: Request, res: Response) => {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email || req.body.email;
        if (!userEmail) {
            return res.status(401).json({ success: false, error: 'Unauthorized: missing user email' });
        }

        const { title, content, tags } = req.body;
        if (!title || !title.trim() || !content || !content.trim()) {
            return res.status(400).json({ success: false, error: 'Title and content are required' });
        }

        const note = new ContextNote({
            userEmail,
            title: title.trim(),
            content: content.trim(),
            tags: Array.isArray(tags) ? tags.map((t: string) => String(t).trim()).filter(Boolean) : [],
        });

        await note.save();

        // Asynchronously or synchronously index embedding with Basket
        try {
            await indexNoteEmbedding(note);
        } catch (e: any) {
            logger.warn(`[ContextNoteController] Note created but embedding indexing failed: ${e.message}`);
        }

        return res.status(201).json({
            success: true,
            message: 'Context note created and indexed successfully',
            note: {
                _id: note._id,
                title: note.title,
                content: note.content,
                tags: note.tags,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt,
                isIndexed: (note.embedding && note.embedding.length > 0) || false,
            },
        });
    } catch (err: any) {
        return handleError(filePath, 'createNote', res, err, 'Creating context note');
    }
};

export const updateNote = async (req: Request, res: Response) => {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email || req.body.email;
        const { id } = req.params;

        if (!userEmail) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const note = await ContextNote.findOne({ _id: id, userEmail });
        if (!note) {
            return res.status(404).json({ success: false, error: 'Note not found' });
        }

        const { title, content, tags } = req.body;
        if (title && title.trim()) note.title = title.trim();
        if (content && content.trim()) note.content = content.trim();
        if (Array.isArray(tags)) {
            note.tags = tags.map((t: string) => String(t).trim()).filter(Boolean);
        }

        await note.save();

        // Recompute embedding
        try {
            await indexNoteEmbedding(note);
        } catch (e: any) {
            logger.warn(`[ContextNoteController] Note updated but embedding update failed: ${e.message}`);
        }

        return res.status(200).json({
            success: true,
            message: 'Note updated and re-indexed',
            note: {
                _id: note._id,
                title: note.title,
                content: note.content,
                tags: note.tags,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt,
                isIndexed: (note.embedding && note.embedding.length > 0) || false,
            },
        });
    } catch (err: any) {
        return handleError(filePath, 'updateNote', res, err, 'Updating context note');
    }
};

export const deleteNote = async (req: Request, res: Response) => {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email;
        const { id } = req.params;

        if (!userEmail) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const result = await ContextNote.findOneAndDelete({ _id: id, userEmail });
        if (!result) {
            return res.status(404).json({ success: false, error: 'Note not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Context note deleted successfully',
        });
    } catch (err: any) {
        return handleError(filePath, 'deleteNote', res, err, 'Deleting context note');
    }
};

export const searchNotes = async (req: Request, res: Response) => {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email || (req.query.email as string);
        const query = (req.query.q as string) || '';

        if (!userEmail) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const results = await retrieveRelevantContextNotes(query, userEmail, 5);

        return res.status(200).json({
            success: true,
            results,
        });
    } catch (err: any) {
        return handleError(filePath, 'searchNotes', res, err, 'RAG searching context notes');
    }
};

const contextNoteControllers = {
    getNotes,
    createNote,
    updateNote,
    deleteNote,
    searchNotes,
};

export default contextNoteControllers;
