import Cookies from "js-cookie";

const parseGmailCookies = () => {
    return {
        gmailCookie: decodeURIComponent(Cookies.get('gmail') || ''),
        pictureCookie: decodeURIComponent(Cookies.get('picture') || '')
    };
};

function makeDayKeyFromDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const utils = {
    parseGmailCookies,
    makeDayKeyFromDate
};

export default utils;