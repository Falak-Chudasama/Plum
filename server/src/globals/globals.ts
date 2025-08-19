import { OAuth2Client } from 'google-auth-library';

const globals: { userGmail: string, OAuthObject: OAuth2Client | null } = {
    userGmail: '',
    OAuthObject: null
};

export default globals