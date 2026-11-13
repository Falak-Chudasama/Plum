const constants = {
    origin: "https://plum.jam",
    serverOrigin: "https://api.plum.jam",
    serverWssOrigin: "wss://ws.plum.jam",
    clientId: "897968001166-itakusc2tfqfvoikv651rgatq3vpkg84.apps.googleusercontent.com",
    redirectURI: "http://localhost:10010/user/auth/callback",
    googleAuthUrl: 'https://accounts.google.com/o/oauth2/v2/auth?',
    googleAuthRequestUrl: {
        client_id: '897968001166-itakusc2tfqfvoikv651rgatq3vpkg84.apps.googleusercontent.com',
        redirect_uri: 'http://localhost:10010/user/auth/callback',
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
        gray: { dark: '#616161', light: '#E4E4E4' },
        red: { dark: '#E53935', light: '#FFD7DC' },
        green: { dark: '#43A047', light: '#DAFFDC' },
        blue: { dark: '#1E88E5', light: '#DDEFFF' },
        yellow: { dark: '#FF9000', light: '#FFF0D5' },
        purple: { dark: '#7A5BB9', light: '#E0CCFF' },
    },
    plumColors: {
        primary: '#7A5BB9',
        primaryDark: '#6F5E90',
        secondary: '#403964',
        purple: '#EBDEFF',
        bg: '#F7F2FF',
        bgBold: '#EEE5FF',
        surface: '#D1C8EB',
        surfaceHover: '#CFBFFB',
    },
};

export default constants;