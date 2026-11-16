import mongoose from 'mongoose';
import Command from '../models/command.models';
import Note from '../models/note.models';
import Chats from '../models/chat';
import { formatDateTime } from '../utils/utils';
import logger from '../utils/logger.utils';

export async function initPlumDatabase() {
    try {
        const db = mongoose.connection.db;
        if (!db) return;

        const collections = await db.listCollections().toArray();
        const colNames = collections.map((c) => c.name);

        // Migrate and drop legacy contextnotes if present
        if (colNames.includes('contextnotes')) {
            try {
                const oldNotes = await db.collection('contextnotes').find().toArray();
                if (oldNotes.length > 0) {
                    for (const n of oldNotes) {
                        const now = formatDateTime();
                        await Note.updateOne(
                            { _id: n._id },
                            {
                                $setOnInsert: {
                                    title: n.title,
                                    content: n.content,
                                    tags: n.tags || [],
                                    metadata: n.metadata || {},
                                    application: 'plum',
                                    created_at: n.createdAt ? formatDateTime(new Date(n.createdAt)) : now,
                                    updated_at: n.updatedAt ? formatDateTime(new Date(n.updatedAt)) : now,
                                    userEmail: n.userEmail,
                                },
                            },
                            { upsert: true }
                        );
                    }
                    logger.info(`[initPlumDatabase] Migrated ${oldNotes.length} legacy contextnotes to notes`);
                }
                await db.collection('contextnotes').drop();
                logger.info('[initPlumDatabase] Dropped legacy contextnotes collection');
            } catch (migErr: any) {
                logger.warn(`[initPlumDatabase] Legacy notes migration note: ${migErr.message}`);
            }
        }

        // Ensure mandatory collections exist
        if (!colNames.includes('chats')) {
            await db.createCollection('chats');
        }
        if (!colNames.includes('notes')) {
            await db.createCollection('notes');
        }
        if (!colNames.includes('commands')) {
            await db.createCollection('commands');
        }

        // Seed default behavioral command if none exists
        const count = await Command.countDocuments({ application: 'plum' });
        if (count === 0) {
            const now = formatDateTime();
            const defaultCmd = await Command.create({
                command: 'Always format calendar dates in ISO 8601 (YYYY-MM-DD) and assume IST timezone.',
                is_active: true,
                application: 'plum',
                created_at: now,
                updated_at: now,
            });
            logger.info(`[initPlumDatabase] Seeded default behavioral command id=${defaultCmd._id}`);

            // Sync with Basket
            try {
                await fetch('https://api.basket.jam/context/commands/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        application: 'plum',
                        action: 'upsert',
                        command_id: defaultCmd._id.toString(),
                        command: defaultCmd.command,
                    }),
                });
                logger.info('[initPlumDatabase] Synced initial command to Basket');
            } catch (syncErr: any) {
                logger.warn(`[initPlumDatabase] Basket command sync warning: ${syncErr.message}`);
            }
        }
    } catch (err: any) {
        logger.error(`[initPlumDatabase] Failed: ${err.message}`);
    }
}

export default initPlumDatabase;
