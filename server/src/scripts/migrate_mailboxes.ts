import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../models/user.models';
import Mailbox from '../models/mailbox.models';

const mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:4090/plum';

async function migrate() {
    try {
        await mongoose.connect(mongoUrl);
        console.log('Connected to MongoDB at', mongoUrl);

        const users = await User.find({});
        console.log(`Found ${users.length} users in database.`);

        for (const user of users) {
            console.log(`Processing user: ${user.email}`);

            // 1. Create primary mailbox for user itself if google tokens exist
            if (user.google?.accessToken || user.google?.refreshToken) {
                const fullName = [user.name, user.lastName].filter(Boolean).join(' ') || user.email;
                await Mailbox.findOneAndUpdate(
                    { userEmail: user.email, email: user.email },
                    {
                        $set: {
                            userEmail: user.email,
                            email: user.email,
                            name: fullName,
                            picture: user.profilePicture || '',
                            tokens: {
                                access_token: user.google.accessToken,
                                refresh_token: user.google.refreshToken,
                                id_token: user.google.IdToken,
                            },
                            status: 'connected',
                            isPrimary: true,
                        }
                    },
                    { upsert: true, new: true }
                );
                console.log(`  -> Upserted primary mailbox for ${user.email}`);
            }
        }

        // Cross-link falakchudasama7766@gmail.com to falak.chudasama@somaiya.edu workspace so user has both mailboxes ready to test!
        const somaiyaUser = await User.findOne({ email: 'falak.chudasama@somaiya.edu' });
        const personalUser = await User.findOne({ email: 'falakchudasama7766@gmail.com' });

        if (somaiyaUser && personalUser) {
            await Mailbox.findOneAndUpdate(
                { userEmail: somaiyaUser.email, email: personalUser.email },
                {
                    $set: {
                        userEmail: somaiyaUser.email,
                        email: personalUser.email,
                        name: `${personalUser.name} ${personalUser.lastName || ''}`.trim() || 'Falak (Personal Gmail)',
                        picture: personalUser.profilePicture || '',
                        tokens: {
                            access_token: personalUser.google?.accessToken,
                            refresh_token: personalUser.google?.refreshToken,
                            id_token: personalUser.google?.IdToken,
                        },
                        status: 'connected',
                        isPrimary: false,
                    }
                },
                { upsert: true, new: true }
            );
            console.log(`  -> Linked personal mailbox (${personalUser.email}) to Somaiya user (${somaiyaUser.email})`);

            // Also link somaiya mailbox to personal user workspace
            await Mailbox.findOneAndUpdate(
                { userEmail: personalUser.email, email: somaiyaUser.email },
                {
                    $set: {
                        userEmail: personalUser.email,
                        email: somaiyaUser.email,
                        name: `${somaiyaUser.name} ${somaiyaUser.lastName || ''}`.trim() || 'Falak (Somaiya College)',
                        picture: somaiyaUser.profilePicture || '',
                        tokens: {
                            access_token: somaiyaUser.google?.accessToken,
                            refresh_token: somaiyaUser.google?.refreshToken,
                            id_token: somaiyaUser.google?.IdToken,
                        },
                        status: 'connected',
                        isPrimary: false,
                    }
                },
                { upsert: true, new: true }
            );
            console.log(`  -> Linked Somaiya mailbox (${somaiyaUser.email}) to Personal user (${personalUser.email})`);
        }

        const count = await Mailbox.countDocuments({});
        console.log(`Migration complete. Total mailboxes in DB: ${count}`);
        await mongoose.disconnect();
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();

