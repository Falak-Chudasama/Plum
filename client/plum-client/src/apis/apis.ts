import axios from "axios";
import contants from "../constants/constants"
import handleError from "../utils/errors.utils";

function googleAuth() {
    window.location.href = contants.googleAuthUrl + new URLSearchParams(contants.googleAuthRequestUrl);
};

/*
to: email.to,
cc: email?.cc,
bcc: email?.bcc,
subject: email?.subject || 'NO SUBJECT',
text: email.contentType !== 'text/html' ? email.body : undefined,
html: email.contentType === 'text/html' ? email.body : undefined,
attachments: email?.files?.map((file: { name: string; content: string | Buffer; type: string }) => ({
    filename: file.name,
    content: file.content,
    contentType: file.type,
}))
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
            {
                withCredentials: true
            }
            // { email: mail }
        );

        console.log('✅ Email sent successfully:', response.data);
        return response.data;
    } catch (err) {
        console.error(err);
        handleError(err);
    }
};

async function fetchMail() { };

async function draftMail() { };

const apis = {
    googleAuth,
    sendMail,
    fetchMail,
    draftMail,
};

export default apis;