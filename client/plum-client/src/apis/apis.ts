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

        console.log('LOGIN: ');
        console.log(result.data);

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

        console.log('Email sent successfully:', response.data);
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

        console.log(response.data.emails);
        return response.data;
    } catch (err) {
        handleError(err);
    }
};

async function draftMail() { };


const apis = {
    googleAuth,
    login,
    sendMail,
    fetchMail,
    draftMail,
};

export default apis;