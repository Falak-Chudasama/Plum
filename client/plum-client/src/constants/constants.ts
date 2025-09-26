const constants = {
    origin: "https://plum.com",
    serverOrigin: "https://api.plum.com",
    clientId: "633855094180-f4sutrn7ov3abukq2s98gnmuqf6u34vh.apps.googleusercontent.com",
    redirectURI: "https://api.plum.com/user/auth/callback",
    googleAuthUrl: 'https://accounts.google.com/o/oauth2/v2/auth?',
    googleAuthRequestUrl: {
        client_id: '633855094180-f4sutrn7ov3abukq2s98gnmuqf6u34vh.apps.googleusercontent.com',
        redirect_uri: 'https://api.plum.com/user/auth/callback',
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
    },
    colorMap: {
        red: { dark: '#E53935', light: '#FFD7DC' },
        green: { dark: '#43A047', light: '#DAFFDC' },
        blue: { dark: '#1E88E5', light: '#DDEFFF' },
        yellow: { dark: '#FF9000', light: '#FFF0D5' },
        purple: { dark: '#7A5BB9', light: '#E0CCFF' },
        gray: { dark: '#616161', light: '#E4E4E4' },
    },
};

export default constants;