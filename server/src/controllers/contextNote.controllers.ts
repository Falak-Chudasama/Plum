import { Request, Response } from 'express';
import Note from '../models/note.models';
import { AuthenticatedRequest } from '../types/types';
import handleError from '../utils/errors.utils';
import logger from '../utils/logger.utils';
import { formatDateTime } from '../utils/utils';

const filePath = '/src/controllers/contextNote.controllers.ts';
const BASKET_SYNC_URL = process.env.BASKET_SYNC_URL || 'https://api.basket.jam/context/notes/sync';

export async function syncNoteWithBasket(action: 'upsert' | 'delete', noteId: string, note?: any) {
    try {
        const payload: Record<string, any> = {
            application: 'plum',
            action,
            note_id: noteId.toString(),
        };

        if (action === 'upsert' && note) {
            payload.title = note.title;
            payload.content = note.content;
            payload.metadata = note.metadata || {};
        }

        const res = await fetch(BASKET_SYNC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Basket-Application': 'plum',
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errText = await res.text();
            logger.warn(`[NoteSync] Basket sync returned status ${res.status}: ${errText}`);
        } else {
            logger.info(`[NoteSync] Successfully synced note_id=${noteId} action=${action} with Basket`);
        }
    } catch (err: any) {
        logger.warn(`[NoteSync] Failed to sync note with Basket: ${err.message}`);
    }
}

export const getNotes = async (req: Request, res: Response) => {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email || (req.query.email as string);

        const filter: any = { application: 'plum' };
        if (userEmail) {
            filter.$or = [{ userEmail }, { userEmail: { $exists: false } }, { userEmail: null }];
        }

        const notes = await Note.find(filter)
            .sort({ updated_at: -1, created_at: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            notes,
        });
    } catch (err: any) {
        return handleError(filePath, 'getNotes', res, err, 'Fetching notes');
    }
};

export const createNote = async (req: Request, res: Response) => {
    try {
        const userEmail = (req as AuthenticatedRequest).user?.email || req.body.email;
        const { title, content, tags, metadata } = req.body;

        if (!title || !title.trim() || !content || !content.trim()) {
            return res.status(400).json({ success: false, error: 'Title and content are required' });
        }

        const now = formatDateTime();
        const cleanTags = Array.isArray(tags)
            ? tags.map((t: string) => String(t).trim()).filter(Boolean)
            : [];
        const cleanMeta = metadata && typeof metadata === 'object' ? metadata : { category: cleanTags[0] || 'general' };

        const note = new Note({
            title: title.trim(),
            content: content.trim(),
            tags: cleanTags,
            metadata: cleanMeta,
            application: 'plum',
            created_at: now,
            updated_at: now,
            userEmail,
        });

        await note.save();

        // Sync with Basket in real-time
        await syncNoteWithBasket('upsert', note._id.toString(), note);

        return res.status(201).json({
            success: true,
            message: 'Note created and synced with Basket 3-Tier context',
            note,
        });
    } catch (err: any) {
        return handleError(filePath, 'createNote', res, err, 'Creating note');
    }
};

export const updateNote = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, content, tags, metadata } = req.body;

        const note = await Note.findById(id);
        if (!note) {
            return res.status(404).json({ success: false, error: 'Note not found' });
        }

        if (title && title.trim()) note.title = title.trim();
        if (content && content.trim()) note.content = content.trim();
        if (Array.isArray(tags)) {
            note.tags = tags.map((t: string) => String(t).trim()).filter(Boolean);
        }
        if (metadata && typeof metadata === 'object') {
            note.metadata = { ...(note.metadata || {}), ...metadata };
        }
        note.updated_at = formatDateTime();

        await note.save();

        // Sync update with Basket in real-time
        await syncNoteWithBasket('upsert', note._id.toString(), note);

        return res.status(200).json({
            success: true,
            message: 'Note updated and re-synced with Basket',
            note,
        });
    } catch (err: any) {
        return handleError(filePath, 'updateNote', res, err, 'Updating note');
    }
};

export const deleteNote = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const note = await Note.findByIdAndDelete(id);
        if (!note) {
            return res.status(404).json({ success: false, error: 'Note not found' });
        }

        // Sync deletion with Basket in real-time
        await syncNoteWithBasket('delete', id.toString());

        return res.status(200).json({
            success: true,
            message: 'Note deleted and purged from Basket context',
        });
    } catch (err: any) {
        return handleError(filePath, 'deleteNote', res, err, 'Deleting note');
    }
};

export const searchNotes = async (req: Request, res: Response) => {
    try {
        const query = (req.query.q as string) || '';
        if (!query.trim()) {
            return res.status(200).json({ success: true, results: [] });
        }

        // Direct tiered-query to Basket
        try {
            const basketRes = await fetch('https://api.basket.jam/context/rag/tiered-query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Basket-Application': 'plum',
                },
                body: JSON.stringify({
                    query,
                    application: 'plum',
                    retrieve_notes: true,
                    retrieve_chat: false,
                }),
            });
            if (basketRes.ok) {
                const data = await basketRes.json();
                return res.status(200).json({
                    success: true,
                    results: data.notes_chunks || data.results || [],
                });
            }
        } catch (_) {}

        // Local regex fallback if Basket query is unavailable
        const regex = new RegExp(query.trim(), 'i');
        const results = await Note.find({
            application: 'plum',
            $or: [{ title: regex }, { content: regex }, { tags: regex }],
        }).limit(10);

        return res.status(200).json({
            success: true,
            results,
        });
    } catch (err: any) {
        return handleError(filePath, 'searchNotes', res, err, 'Searching notes');
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
