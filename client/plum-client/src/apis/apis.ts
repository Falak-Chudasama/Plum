import axios from "axios";
import contants from "../constants/constants"
import handleError from "../utils/errors.utils";

function googleAuth() {
    window.location.href = contants.googleAuthUrl + new URLSearchParams(contants.googleAuthRequestUrl);
};

/*

*/

const dummyMail = {
    to: 'falakchudasama7766@gmail.com',
    subject: 'A thought',
    contentType: 'text/plain',
    body: 'I had a thought, but forgot the thought, remind me the thought'
}

async function sendMail(mail: any = '') {
    try {
        const response = await axios.post(
            `${contants.serverOrigin}/email/send`,
            { email: dummyMail },
            { withCredentials: true }
            // { email: mail }
        );
        
        console.log('Email sent successfully:', response.data);
        return response.data;
    } catch (err) {
        console.error(err);
        handleError(err);
    }
};

async function fetchMail(numberOfEmails: number = 4) { 
    try {
        const response = await axios.get(
            `${contants.serverOrigin}/email/fetch`,
            { 
                params: { numberOfEmails },
                withCredentials: true
            }
        );

        // @ts-ignore
        if (!response.data.success) {
            // @ts-ignore
            throw Error(response.data.message);
        }

        console.log(response.data.emails);
        return response.data;
    } catch (err) {
        console.error(err);
        handleError(err);
    }
};

async function login(email: string = 'falakchudasama7766@gmail.com', fName: string = 'Falak', lName: string = 'Chudasama') { // change defaults
    try {
        const result = await axios.post(
            `${contants.serverOrigin}/user/auth/login`,
            {
                email,
                fName,
                lName
            },
            { withCredentials: true }
        )

        console.log('LOGIN: ')
        console.log(result.data);

        return result.data;
    } catch (err) {
        console.error(err);
        handleError(err);
    }
}

async function draftMail() { };

const apis = {
    googleAuth,
    login,
    sendMail,
    fetchMail,
    draftMail,
};

export default apis;