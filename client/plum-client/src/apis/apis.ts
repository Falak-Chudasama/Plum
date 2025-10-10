import axios from "axios";
import constants from "../constants/constants"
import handleError from "../utils/errors.utils";
import utils from "../utils/utils";
import type { CategoryType } from "../types/types";

const axiosAuth = axios.create({
    baseURL: `${constants.serverOrigin}/user/`,
    withCredentials: true
});

const axiosEmail = axios.create({
    baseURL: `${constants.serverOrigin}/email/`,
    withCredentials: true
});

const axiosCategory = axios.create({
    baseURL: `${constants.serverOrigin}/category/`,
    withCredentials: true
});

/*
    Auth APIs
*/

async function login(email: string, fName: string, lName: string) {
    try {
        const result = await axiosAuth.post('auth/login', { email, fName, lName })

        // @ts-ignore
        if (!result.data.success) {
            // @ts-ignore
            throw Error(result.data.message);
        }

        return result.data;
    } catch (err) {
        handleError(err);
        throw err;
    }
}

function googleAuth() {
    window.location.href = constants.googleAuthUrl + new URLSearchParams(constants.googleAuthRequestUrl);
};

async function getCategories(email: string) {
    try {
        const result = await axiosAuth.get(`categories/${email}`)

        console.log('Getting Categories API called');

        // @ts-ignore
        if (!result.data.success) {
            // @ts-ignore
            throw Error(result.data.message);
        }

        console.log('Successfully Got Categories API called');
        return result.data;
    } catch (err) {
        handleError(err);
        throw err;
    }
}

/*
    Mail APIs
*/

async function sendMail(email: any = '') {
    try {
        console.log('Getting Mails');
        const response = await axiosEmail.post('send', { email });

        // @ts-ignore
        if (!response.data.success) {
            // @ts-ignore
            throw Error(response.data.message);
        }

        console.log('Successfully Got Mails');
        return response.data;
    } catch (err) {
        handleError(err);
        throw err;
    }
};

async function fetchMailsDate(date: string, month: string, year: string) {
    try {
        console.log('Getting Mails by Date');
        const { gmailCookie: email } = utils.parseGmailCookies();
        const response = await axiosEmail.post('fetch-by-date', {
            email, date, month, year
        });

        // @ts-ignore
        if (!response.data.success) {
            // @ts-ignore
            throw new Error(response.data.message);
        }

        console.log('Successfully Got Mails by Date');
        return response.data;
    } catch (err) {
        handleError(err);
        throw err;
    }
}

async function fetchMails(numberOfEmails: number = 10) {
    try {
        const response = await axiosEmail.get(
            '/fetch',
            { params: { numberOfEmails } }
        );

        // @ts-ignore
        if (!response.data.success) {
            // @ts-ignore
            throw Error(response.data.message);
        }
        return response.data;
    } catch (err) {
        handleError(err);
        throw err;
    }
};

async function updateIsViewed(id: string) {
    try {
        const { gmailCookie: email } = utils.parseGmailCookies();

        if (!id) {
            throw Error("Email's ID is 'undefined'")
        }
        if (!email) {
            throw Error("Gmail ID is blank")
        }

        const response = await axiosEmail.patch(
            'set-is-viewed',
            { id, email }
        );

        // @ts-ignore
        if (!response.data.success) {
            // @ts-ignore
            throw Error(response.data.message);
        }

        return response.data;
    } catch (err) {
        handleError(err);
        throw err;
    }
}

async function draftMail() { };

/*
    Category APIs
*/

async function findAllCategories() {
    try {
        const response = await axiosCategory.get('find');

        // @ts-ignore
        if (!response.data.success) {
            // @ts-ignore
            throw Error(response.data.message);
        }

        return response.data;
    } catch (err) {
        handleError(err);
        throw err;
    }
}

async function findCategories(email: string) {
    try {
        const response = await axiosCategory.get(`find/${email}`);
    
        // @ts-ignore
        if (!response.data.success) {
            // @ts-ignore
            throw Error(response.data.message);
        }
    
        return response.data;
    } catch (err) {
        handleError(err);
        throw err;
    }
}

async function createCategory(category: CategoryType) {
    try {
        const response = await axiosCategory.post('create', category);
    
        // @ts-ignore
        if (!response.data.success) {
            // @ts-ignore
            throw Error(response.data.message);
        }
    
        return response.data;
    } catch (err) {
        handleError(err);
        throw err;
    }
}

async function editCategory(category: CategoryType) {
    try {
        const response = await axiosCategory.patch('edit', category);
    
        // @ts-ignore
        if (!response.data.success) {
            // @ts-ignore
            throw Error(response.data.message);
        }
    
        return response.data;
    } catch (err) {
        handleError(err);
        throw err;
    }
}

async function deleteCategory(category: CategoryType) {
    try {
        const response = await axiosCategory.delete('delete', {
            params: { category: category.category, email: category.email }
        });
    
        // @ts-ignore
        if (!response.data.success) {
            // @ts-ignore
            throw Error(response.data.message);
        }
    
        return response.data;
    } catch (err) {
        handleError(err);
        throw err;
    }
}

const apis = {
    googleAuth,
    login,
    getCategories,
    sendMail,
    fetchMails,
    fetchMailsDate,
    updateIsViewed,
    draftMail,
    findAllCategories,
    findCategories,
    createCategory,
    editCategory,
    deleteCategory
};

export default apis;