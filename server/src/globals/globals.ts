import { OAuth2Client } from 'google-auth-library';

const globals: {
    email: string | null;
    userFn: string | null;
    userLn: string | null;
    OAuthObject?: OAuth2Client | null;
    date: string | null;
    time: string | null;
    gmailFetcherJobRunning: boolean;
    summarizingJobRunning: boolean;
    categoriesFeedingJobRunning: boolean;
    intentsFeedingJobRunning: boolean;
} = {
    email: null,
    userFn: null,
    userLn: null,
    OAuthObject: null,
    date: null,
    time: null,
    gmailFetcherJobRunning: false,
    summarizingJobRunning: false,
    categoriesFeedingJobRunning: false,
    intentsFeedingJobRunning: false,
};

export default globals