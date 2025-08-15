export default async function send() {
    await fetch('http://api.plum.com/user/send/email', {
        method: "POST"
    });
};