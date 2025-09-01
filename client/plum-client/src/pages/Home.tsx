import useGmailStore from "../store/GmailStore";
import Cookies from "js-cookie";
import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";

function Home() {
    const [authenticated, setAuthenticated] = useState(false);
    const { gmail, setGmail } = useGmailStore();
    const { id } = useParams<{ id: string }>();
    let gmailCookie = Cookies.get('gmail');
    gmailCookie = decodeURIComponent(gmailCookie || 'h');
    let pictureCookie = Cookies.get('picture');
    pictureCookie = decodeURIComponent(pictureCookie || 'h');

    useEffect(() => {
        document.title = 'Plum';

        if (gmailCookie) {
            setGmail({ gmailId: gmailCookie, profileUrl: pictureCookie });
        } else if (id !== gmail?.gmailId) {
            setAuthenticated(false);
            return;
        }
        setAuthenticated(true);
    });

    if (!authenticated) {
        return <p>NOT AUTH</p>
        // return <Navigate to={'/login?warning=invalid_gmailId'} replace />
    }

    console.log(gmailCookie);

    return (
        <p>Hello {gmailCookie}</p>
    )
}

export default Home;
