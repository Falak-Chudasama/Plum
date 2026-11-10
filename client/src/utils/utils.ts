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

function toIST(timestamp: Date | string) {
    const date = new Date(timestamp);
    const istDate = new Date(
        date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );
    return istDate;
}

function capitalizeWords(str: string) {
    return str
        .split(/[_\s]+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

const utils = {
    parseGmailCookies,
    makeDayKeyFromDate,
    capitalizeWords,
    toIST
};

export default utils;