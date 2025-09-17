import axios from "axios";
import contants from "../constants/constants"
import handleError from "../utils/errors.utils";

const axiosAuth = axios.create({
    baseURL: `${contants.serverOrigin}/user`,
    withCredentials: true
});

const axiosEmail = axios.create({
    baseURL: `${contants.serverOrigin}/email/`,
    withCredentials: true
});

/*
    Auth APIs
*/

async function login(email: string, fName: string, lName: string) {
    try {
        const result = await axiosAuth.post('/auth/login', { email, fName, lName })

        if (!result.data || !result.data.success) {
            throw new Error(result.data?.message || 'Failed to login');
        }

        return result.data;
    } catch (err) {
        handleError(err);
        throw err;
    }
}

function googleAuth() {
    window.location.href = contants.googleAuthUrl + new URLSearchParams(contants.googleAuthRequestUrl);
};

async function getCategories(email: string) {
    try {
        const result = await axiosAuth.get(`/categories/${email}`)

        console.log('Getting Categories API called');

        if (!result.data || !result.data.success) {
            throw new Error(result.data?.message || 'Failed to get Categories');
        }

        return result.data;
    } catch (err) {
        handleError(err);
        throw err;
    }
}

/*
    Mail APIs
*/

const dummyMail = {
    to: 'falakchudasama7766@gmail.com',
    subject: 'A thought',
    contentType: 'text/plain',
    body: 'I had a thought, but forgot the thought, remind me the thought'
}

async function sendMail(email: any = '') {
    try {
        const response = await axiosEmail.post('/send', { email });
        return response.data;
    } catch (err) {
        console.error(err);
        handleError(err);
    }
};

async function fetchMail(numberOfEmails: number = 4) {
    try {
        const response = await axiosEmail.get(
            '/fetch',
            {params: { numberOfEmails }}
        );

        // @ts-ignore
        if (!response.data.success) {
            // @ts-ignore
            throw Error(response.data.message);
        }
        return response.data;
    } catch (err) {
        handleError(err);
    }
};

async function draftMail() { };


const apis = {
    googleAuth,
    login,
    getCategories,
    sendMail,
    fetchMail,
    draftMail,
};

export default apis;