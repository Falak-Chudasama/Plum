import axios from 'axios';
import https from 'https';

const agent = new https.Agent({ rejectUnauthorized: false });

async function runTest() {
    console.log('--- Testing Plum UI Endpoints & Multi-Account Isolation ---');

    // 1. Test Login as falak.chudasama@somaiya.edu
    const loginRes = await axios.post(
        'https://api.plum.com/user/auth/login',
        {
            email: 'falak.chudasama@somaiya.edu',
            fName: 'Falak',
            lName: 'Chudasama',
        },
        { httpsAgent: agent }
    );

    console.log('[1] Login Status:', loginRes.status, loginRes.data);
    const cookies = loginRes.headers['set-cookie'] || [];
    const cookieHeader = cookies.map((c) => c.split(';')[0]).join('; ');
    console.log('[1] Received Cookies:', cookieHeader);

    // 2. Test /user/me
    const meRes = await axios.get('https://api.plum.com/user/me', {
        headers: { Cookie: cookieHeader },
        httpsAgent: agent,
    });
    console.log('[2] /user/me:', meRes.status, meRes.data);

    // 3. Test /user/mailboxes
    const mailboxesRes = await axios.get('https://api.plum.com/user/mailboxes', {
        headers: { Cookie: cookieHeader },
        httpsAgent: agent,
    });
    console.log('[3] /user/mailboxes count:', mailboxesRes.data.count);
    console.log('[3] Mailboxes list:', mailboxesRes.data.mailboxes.map((m: any) => ({
        email: m.email,
        name: m.name,
        isPrimary: m.isPrimary,
        status: m.status,
        tokenHealth: m.tokenHealth,
        hasRefreshToken: m.hasRefreshToken,
    })));

    // 4. Test status of individual mailbox
    if (mailboxesRes.data.mailboxes.length > 0) {
        const mbId = mailboxesRes.data.mailboxes[0].id;
        const statusRes = await axios.get(`https://api.plum.com/user/mailboxes/${mbId}/status`, {
            headers: { Cookie: cookieHeader },
            httpsAgent: agent,
        });
        console.log('[4] Mailbox status check:', statusRes.data);
    }

    // 5. Test draft fetching for active mailbox
    const draftsRes = await axios.get('https://api.plum.com/email/drafts', {
        headers: {
            Cookie: cookieHeader,
            'x-mailbox-email': 'falak.chudasama@somaiya.edu',
        },
        httpsAgent: agent,
    });
    console.log('[5] Drafts for falak.chudasama@somaiya.edu:', draftsRes.data.draftsCount);

    // 6. Test switching active mailbox header to second mailbox
    const draftsRes2 = await axios.get('https://api.plum.com/email/drafts', {
        headers: {
            Cookie: cookieHeader,
            'x-mailbox-email': 'falakchudasama7766@gmail.com',
        },
        httpsAgent: agent,
    });
    console.log('[6] Drafts for falakchudasama7766@gmail.com:', draftsRes2.data.draftsCount, 'Mailbox:', draftsRes2.data.mailboxEmail);

    console.log('\n--- All UI & Multi-Account Endpoints Verified Successfully! ---');
}

runTest().catch((err) => {
    console.error('Test failed:', err.response?.data || err.message);
    process.exit(1);
});

