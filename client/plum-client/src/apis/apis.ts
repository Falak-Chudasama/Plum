import axios from "axios";
import constants from "../constants/constants"
import handleError from "../utils/errors.utils";
import utils from "../utils/utils";
import type { CategoryType, CraftedMailType } from "../types/types";

const axiosAuth = axios.create({
    baseURL: `${constants.serverOrigin}/user/`,
    withCredentials: true
});

const axiosEmail = axios.create({
    baseURL: `${constants.serverOrigin}/email/`,
    withCredentials: true
});

const axiosUser = axios.create({
    baseURL: `${constants.serverOrigin}/user/`,
    withCredentials: true
});

const axiosCategory = axios.create({
    baseURL: `${constants.serverOrigin}/category/`,
    withCredentials: true
});

const axiosChat = axios.create({
    baseURL: `${constants.serverOrigin}/chat/`,
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
    Use APIs
*/

async function getUser(email: string = utils.parseGmailCookies().gmailCookie) {
    try {
        console.log('Getting User');
        const response = await axiosUser.post('/', { userEmail: email });

        // @ts-ignore
        if (!response.data.success) {
            // @ts-ignore
            throw Error(response.data.message);
        }

        console.log('Successfully Got User');
        return response.data;
    } catch (err) {
        handleError(err);
        throw err;
    }
}

/*
    Mail APIs
*/

async function sendMail(email: CraftedMailType) {
    try {
        console.log('Sending Crafted Mail');
        email = {
            ...email,
            from: utils.parseGmailCookies().gmailCookie
        }
        console.log(email); // delit
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

async function fetchOutboundMailsDate(date: string, month: string, year: string) {
    try {
        console.log('Getting Outbound Mails by Date');
        const { gmailCookie: email } = utils.parseGmailCookies();

        const response = await axiosEmail.post('fetch-outbound-by-date', {
            email, date, month, year
        });

        // @ts-ignore
        if (!response.data.success) {
            // @ts-ignore
            throw new Error(response.data.message);
        }

        console.log('Successfully Got Outbound Mails by Date');
        return response.data;

    } catch (err) {
        handleError(err);
        throw err;
    }
}


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

async function updateOutboundIsViewed(id: string) {
    try {
        const { gmailCookie: email } = utils.parseGmailCookies();

        if (!id) {
            throw Error("Email's ID is 'undefined'");
        }
        if (!email) {
            throw Error("Gmail ID is blank");
        }

        const response = await axiosEmail.patch(
            'set-outbound-is-viewed',
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

async function draftMail(email: CraftedMailType) {
    try {
        console.log('Saving Draft Mail');

        email = {
            ...email,
            from: utils.parseGmailCookies().gmailCookie
        };

        const response = await axiosEmail.post('draft', { email });

        // @ts-ignore
        if (!response.data.success) {
            // @ts-ignore
            throw Error(response.data.message);
        }

        console.log('Successfully Saved Draft Mail');
        return response.data;
    } catch (err) {
        handleError(err);
        throw err;
    }
}

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

/*
    Chat APIs
*/

async function createChat(chat: any) {
    try {
        const response = await axiosChat.post("create", chat);

        // @ts-ignore
        if (!response.data.success) {
            // @ts-ignore
            throw new Error(response.data.message);
        }

        return response.data;
    } catch (err) {
        handleError(err);
        throw err;
    }
}

async function getChatById(id: string) {
    try {
        const response = await axiosChat.get(`get/${id}`);

        // @ts-ignore
        if (!response.data.success) {
            // @ts-ignore
            throw new Error(response.data.message);
        }

        return response.data;
    } catch (err) {
        handleError(err);
        throw err;
    }
}

async function getChatByTitleDate(title: string, createdAt: string, email: string) {
    try {
        const response = await axiosChat.get("getByTitleDate", {
            params: { title, createdAt, email }
        });

        // @ts-ignore
        if (!response.data.success) {
            // @ts-ignore
            throw new Error(response.data.message);
        }

        return response.data;
    } catch (err) {
        handleError(err);
        throw err;
    }
}

async function getChatList(email: string, limit: number = 20, cursor: string | null = null) {
    try {
        const response = await axiosChat.get("getList", {
            params: { email, limit, cursor }
        });

        // @ts-ignore
        if (!response.data.success) {
            // @ts-ignore
            throw new Error(response.data.message);
        }

        return response.data;
    } catch (err) {
        handleError(err);
        throw err;
    }
}

async function updateChat(chat: any) {
    try {
        const response = await axiosChat.put("update", chat);

        // @ts-ignore
        if (!response.data.success) {
            // @ts-ignore
            throw new Error(response.data.message);
        }

        return response.data;
    } catch (err) {
        handleError(err);
        throw err;
    }
}

async function deleteChat(id: string) {
    try {
        const response = await axiosChat.delete("delete", { params: { id } });

        // @ts-ignore
        if (!response.data.success) {
            // @ts-ignore
            throw new Error(response.data.message);
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
    getUser,
    getCategories,

    sendMail,
    fetchMails,
    fetchMailsDate,
    fetchOutboundMailsDate,
    updateIsViewed,
    updateOutboundIsViewed,
    draftMail,

    findAllCategories,
    findCategories,
    createCategory,
    editCategory,
    deleteCategory,

    createChat,
    getChatList,
    getChatById,
    getChatByTitleDate,
    updateChat,
    deleteChat
};

export default apis;