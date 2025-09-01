import Cookies from "js-cookie";

const parseGmailCookies = () => {
    return {
        gmailCookie: decodeURIComponent(Cookies.get('gmail') || ''),
        pictureCookie: decodeURIComponent(Cookies.get('picture') || '')
    };
};

const utils = {
    parseGmailCookies
};

export default utils;