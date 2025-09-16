import { OAuth2Client } from 'google-auth-library';

const globals: {
    email: string | null;
    OAuthObject?: OAuth2Client | null;
    date: string | null;
    time: string | null;
    gmailFetcherJobRunning: boolean;
    summarizingJobRunning: boolean;
    categoriesFeedingJobRunning: boolean;
} = {
    email: null,
    OAuthObject: null,
    date: null,
    time: null,
    gmailFetcherJobRunning: false,
    summarizingJobRunning: false,
    categoriesFeedingJobRunning: false,
};

export default globals