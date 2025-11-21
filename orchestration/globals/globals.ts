import msAPIs from "../apis/ms.apis";

const globals = {
    mostRecentPrompt: '',
    mostRecentResponse: '',
    mostRecentCraftedMail: '',
    mostRecentQuery: '',
    mostRecentQueryResult: [],
    userObj: {},
    mongoClient: {},
    db: {},
    clearGlobalContext: async function () {
        this.mostRecentCraftedMail = '';
        this.mostRecentPrompt = '';
        this.mostRecentQuery = '';
        this.mostRecentQueryResult = [];
        this.mostRecentResponse = '';

        await msAPIs.chatDelAll();
    }
};

export default globals;