const contants = {
    origin: "http://plum.com",
    serverOrigin: "http://api.plum.com",
    clientId: "633855094180-f4sutrn7ov3abukq2s98gnmuqf6u34vh.apps.googleusercontent.com",
    redirectURI: "http://api.plum.com/user/auth/callback",
    googleAuthUrl: 'https://accounts.google.com/o/oauth2/v2/auth?',
    googleAuthRequestUrl: {
        client_id: '633855094180-f4sutrn7ov3abukq2s98gnmuqf6u34vh.apps.googleusercontent.com',
        redirect_uri: 'http://api.plum.com/user/auth/callback',
        response_type: 'code',
        scope: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.modify',
            'email',
            'profile',
            'openid'
        ].join(' '),
        access_type: 'offline',
        prompt: 'consent'
    }
};

export default contants;