import contants from "../constants/constants"

export default function googleAuth() {
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
        client_id: contants.clientId,
        redirect_uri: contants.redirectURI,
        response_type: 'code',
        scope: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'email',
            'profile',
            'openid'
        ].join(' '),
        access_type: 'offline',
        prompt: 'consent'
    });
};