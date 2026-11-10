import Mailbox from '../models/mailbox.models';
import User from '../models/user.models';
import logger from './logger.utils';

export interface ResolvedUserIdentity {
    fullName: string;
    firstName: string;
    email: string;
}

/**
 * Resolves the user's authentic display name from Mailbox and User database models
 */
export async function resolveUserIdentity(email: string): Promise<ResolvedUserIdentity> {
    if (!email) {
        return { fullName: '', firstName: '', email: '' };
    }

    let fullName = '';

    try {
        // 1. Direct Mailbox match on active email
        const mailbox = await Mailbox.findOne({ email: email.toLowerCase() }).lean();
        if (mailbox?.name && mailbox.name.trim()) {
            fullName = mailbox.name.trim();
        }

        // 2. Plum User model match
        if (!fullName) {
            const user = await User.findOne({ email: email.toLowerCase() }).lean();
            if (user) {
                const parts = [user.name, user.lastName].filter(Boolean);
                if (parts.length > 0) {
                    fullName = parts.join(' ').trim();
                }
            }
        }

        // 3. Fallback to any linked mailbox with a recorded name
        if (!fullName) {
            const anyLinked = await Mailbox.findOne({
                $or: [{ userEmail: email.toLowerCase() }, { email: email.toLowerCase() }],
                name: { $exists: true, $ne: '' },
            }).lean();
            if (anyLinked?.name && anyLinked.name.trim()) {
                fullName = anyLinked.name.trim();
            }
        }
    } catch (err: any) {
        logger.warn(`[UserResolver] Error resolving identity for ${email}: ${err.message}`);
    }

    const firstName = fullName.split(' ')[0] || '';

    return {
        fullName,
        firstName,
        email: email.toLowerCase(),
    };
}

