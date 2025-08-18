import contants from "../constants/constants"

function googleAuth() {
    window.location.href = contants.googleAuthUrl + new URLSearchParams(contants.googleAuthRequestUrl);
};

async function sendMail() {};

async function fetchMail() {};

async function draftMail() {};

const apis = {
    googleAuth,
    sendMail,
    fetchMail,
    draftMail,
};

export default apis;