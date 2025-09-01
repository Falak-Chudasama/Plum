import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import utils from "../utils/utils";

function Home() {
    const { id } = useParams<string>();
    const { gmailCookie } = utils.parseGmailCookies();
    const navigate = useNavigate();

    useEffect(() => {
        if (!id && !gmailCookie) {
            navigate(`/signup?warning=unauthorized`, { replace: true });
        } else if (!id || id !== gmailCookie) {
            navigate(`/home/${gmailCookie}`, { replace: true });
        }
    }, [id, gmailCookie, navigate]);

    return (
        <p>Hello</p>
    );
}

export default Home;
